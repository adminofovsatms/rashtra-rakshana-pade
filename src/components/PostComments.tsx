import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    full_name: string | null;
  };
}

interface PostCommentsProps {
  postId: string;
  currentUserId: string;
  onCommentAdded: () => void;
}

const PostComments = ({ postId, currentUserId, onCommentAdded }: PostCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    setComments(data || []);
  };

  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content: newComment.trim()
        });

      setNewComment("");
      onCommentAdded();
      
      toast({
        title: "Comment added",
        description: "Your comment has been posted"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <div className="mt-3 mb-3 pt-3 border-t space-y-3">
      {/* Comments List */}
      {comments.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarFallback className="text-xs">
                  {comment.profiles.full_name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="bg-muted px-3 py-2 rounded-2xl inline-block max-w-full break-words">
                  <p className="font-semibold text-xs leading-tight">
                    {comment.profiles.full_name || "Anonymous"}
                  </p>
                  <p className="text-sm leading-snug mt-0.5">{comment.content}</p>
                </div>
                <p className="text-xs text-muted-foreground ml-3 mt-0.5">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment Input */}
      <form onSubmit={handleAddComment} className="flex items-center gap-2">
        <Input
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 rounded-full bg-muted border-0 h-9 px-4 text-sm"
          disabled={loading}
        />
        <Button 
          type="submit"
          size="icon"
          disabled={loading || !newComment.trim()}
          className="h-9 w-9 rounded-full flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default PostComments;