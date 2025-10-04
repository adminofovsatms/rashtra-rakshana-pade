import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Heart, MessageCircle, Share2, BarChart3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import PostComments from "./PostComments";

interface PostCardProps {
  post: {
    id: string;
    content: string | null;
    post_type: string;
    media_url: string | null;
    created_at: string;
    profiles: {
      full_name: string | null;
      avatar_url: string | null;
    };
  };
  currentUserId: string;
}

const PostCard = ({ post, currentUserId }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [pollOptions, setPollOptions] = useState<any[]>([]);
  const [userVote, setUserVote] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchReactions();
    fetchCommentCount();
    if (post.post_type === "poll") {
      fetchPollData();
    }
  }, [post.id]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from("post_reactions")
      .select("*")
      .eq("post_id", post.id)
      .eq("reaction_type", "like");

    setLikeCount(data?.length || 0);
    setLiked(data?.some((r) => r.user_id === currentUserId) || false);
  };

  const fetchCommentCount = async () => {
    const { data } = await supabase
      .from("comments")
      .select("id")
      .eq("post_id", post.id);

    setCommentCount(data?.length || 0);
  };

  const fetchPollData = async () => {
    // Fetch poll options
    const { data: options } = await supabase
      .from("poll_options")
      .select("*")
      .eq("post_id", post.id);

    if (options) {
      // Fetch aggregated vote counts from the secure view
      const { data: voteCounts } = await supabase
        .from("poll_vote_counts")
        .select("*")
        .in("poll_option_id", options.map(o => o.id));

      // Merge vote counts with options
      const optionsWithVotes = options.map(option => ({
        ...option,
        poll_votes: [{ 
          count: voteCounts?.find(vc => vc.poll_option_id === option.id)?.vote_count || 0 
        }]
      }));

      setPollOptions(optionsWithVotes);

      // Check if current user has voted (RLS now only allows users to see their own votes)
      const { data: userVotes } = await supabase
        .from("poll_votes")
        .select("poll_option_id")
        .eq("user_id", currentUserId)
        .in("poll_option_id", options.map(o => o.id));

      setUserVote(userVotes?.[0]?.poll_option_id || null);
    }
  };

  const handleLike = async () => {
    if (liked) {
      await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentUserId)
        .eq("reaction_type", "like");
    } else {
      await supabase
        .from("post_reactions")
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          reaction_type: "like"
        });
    }
    fetchReactions();
  };

  const handleVote = async (optionId: string) => {
    if (userVote) {
      toast({
        title: "Already voted",
        description: "You've already voted in this poll",
        variant: "destructive"
      });
      return;
    }

    try {
      await supabase
        .from("poll_votes")
        .insert({
          poll_option_id: optionId,
          user_id: currentUserId
        });

      setUserVote(optionId);
      fetchPollData();
      
      toast({
        title: "Vote recorded",
        description: "Thank you for voting!"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const totalVotes = pollOptions.reduce((sum, opt) => sum + (opt.poll_votes?.[0]?.count || 0), 0);

  return (
    <Card className="p-6 animate-slide-up hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4 mb-4">
        <Avatar>
          <AvatarFallback>
            {post.profiles.full_name?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold">{post.profiles.full_name || "Anonymous"}</h3>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {post.content && (
        <p className="mb-4 whitespace-pre-wrap">{post.content}</p>
      )}

      {post.post_type === "image" && post.media_url && (
        <img
          src={post.media_url}
          alt="Post content"
          className="rounded-lg mb-4 w-full h-auto object-contain max-h-[1000px]"
        />
      )}

      {post.post_type === "video" && post.media_url && (
        <video
          src={post.media_url}
          controls
          className="rounded-lg mb-4 w-full max-h-96"
        />
      )}

      {post.post_type === "poll" && pollOptions.length > 0 && (
        <div className="space-y-2 mb-4">
          {pollOptions.map((option) => {
            const voteCount = option.poll_votes?.[0]?.count || 0;
            const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
            const isUserVote = userVote === option.id;

            return (
              <Button
                key={option.id}
                variant={isUserVote ? "default" : "outline"}
                className="w-full justify-start relative overflow-hidden"
                onClick={() => handleVote(option.id)}
                disabled={!!userVote}
              >
                <div
                  className="absolute left-0 top-0 h-full bg-primary/20 transition-all"
                  style={{ width: `${percentage}%` }}
                />
                <div className="relative flex items-center justify-between w-full">
                  <span>{option.option_text}</span>
                  {userVote && (
                    <span className="text-sm">
                      {percentage.toFixed(0)}% ({voteCount})
                    </span>
                  )}
                </div>
              </Button>
            );
          })}
          {userVote && (
            <p className="text-sm text-muted-foreground text-center">
              Total votes: {totalVotes}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 pt-4 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={liked ? "text-red-500" : ""}
        >
          <Heart className={`h-4 w-4 mr-1 ${liked ? "fill-current" : ""}`} />
          {likeCount}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          {commentCount}
        </Button>
        <Button variant="ghost" size="sm">
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
      </div>

      {showComments && (
        <PostComments
          postId={post.id}
          currentUserId={currentUserId}
          onCommentAdded={fetchCommentCount}
        />
      )}
    </Card>
  );
};

export default PostCard;
