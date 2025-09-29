import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

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

  const handleAddComment = async () => {
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

  return (
    <div className="mt-4 pt-4 border-t space-y-4">
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {comment.profiles.full_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium text-sm">{comment.profiles.full_name || "Anonymous"}</p>
                <p className="text-sm">{comment.content}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={2}
          className="resize-none"
        />
        <Button onClick={handleAddComment} disabled={loading || !newComment.trim()}>
          Post
        </Button>
      </div>
    </div>
  );
};

export default PostComments;
