import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Heart, MessageCircle, Share2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import PostComments from "./PostComments";

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    content: string | null;
    post_type: string;
    media_url: string | string[] | null;
    created_at: string;
    location?: string | null;
    profiles: {
      full_name: string | null;
      avatar_url: string | null;
    };
  };
  currentUserId?: string;
  onPostDeleted?: () => void;
}

const PostCard = ({ post, currentUserId, onPostDeleted }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [pollOptions, setPollOptions] = useState<any[]>([]);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchReactions();
    fetchCommentCount();
    if (post.post_type === "poll") {
      fetchPollData();
    }
  }, [post.id, currentUserId]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from("post_reactions")
      .select("*")
      .eq("post_id", post.id)
      .eq("reaction_type", "like");

    setLikeCount(data?.length || 0);
    setLiked(currentUserId ? data?.some((r) => r.user_id === currentUserId) || false : false);
  };

  const fetchCommentCount = async () => {
    const { data } = await supabase
      .from("comments")
      .select("id")
      .eq("post_id", post.id);

    setCommentCount(data?.length || 0);
  };

  const fetchPollData = async () => {
    const { data: options } = await supabase
      .from("poll_options")
      .select("*")
      .eq("post_id", post.id);

    if (options) {
      const { data: voteCounts } = await supabase
        .from("poll_vote_counts")
        .select("*")
        .in("poll_option_id", options.map(o => o.id));

      const optionsWithVotes = options.map(option => ({
        ...option,
        poll_votes: [{ 
          count: voteCounts?.find(vc => vc.poll_option_id === option.id)?.vote_count || 0 
        }]
      }));

      setPollOptions(optionsWithVotes);

      if (currentUserId) {
        const { data: userVotes } = await supabase
          .from("poll_votes")
          .select("poll_option_id")
          .eq("user_id", currentUserId)
          .in("poll_option_id", options.map(o => o.id));

        setUserVote(userVotes?.[0]?.poll_option_id || null);
      }
    }
  };

  const handleLike = async () => {
    //logged out users cannot like redirect to auth

    if (!currentUserId) {
      navigate("/auth");
      return;
    }

    
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
        if (!currentUserId) {
      navigate("/auth");
      return;
    }

    
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

 const handleDelete = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (!currentUserId || currentUserId !== post.user_id) return;

    try {
      if (post.media_url) {
        const mediaUrls = Array.isArray(post.media_url)
          ? post.media_url
          : [post.media_url];

        await fetch("/delete-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ media_urls: mediaUrls }),
        });
      }

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;

      toast({
        title: "Post deleted",
        description: "Your post and media have been successfully deleted",
      });

      onPostDeleted?.(); // removes post from UI without reload
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
  // Not logged in → redirect to auth
  if (!currentUserId) {
    navigate("/auth");
    return;
  }

  const postUrl = `${window.location.origin}/post/${post.id}`;
  const text = post.content
    ? `${post.content.slice(0, 100)}...`
    : "Check out this post";

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${text}\n\n${postUrl}`
  )}`;

  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
};

  const handleAvatarClick = () => {
    if (!currentUserId) {
      // Not logged in, redirect to auth
      window.location.href = "/auth";
      return;
    }

    // If it's the current user's post, go to their profile
    if (currentUserId === post.user_id) {
      navigate("/profile");
    } else {
      // Otherwise, go to the other user's profile
      navigate(`/user/${post.user_id}`);
    }
  };

  // Helper function to determine if URL is video
  const isVideoUrl = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext));
  };

  // Parse media_url to always be an array
  const getMediaUrls = (): string[] => {
    if (!post.media_url) return [];
    if (Array.isArray(post.media_url)) return post.media_url;
    
    if (typeof post.media_url === 'string') {
      try {
        const parsed = JSON.parse(post.media_url);
        return Array.isArray(parsed) ? parsed : [post.media_url];
      } catch {
        return [post.media_url];
      }
    }
    return [];
  };

  const mediaUrls = getMediaUrls();
  const hasMedia = mediaUrls.length > 0;
  const totalVotes = pollOptions.reduce((sum, opt) => sum + (opt.poll_votes?.[0]?.count || 0), 0);

  // Carousel navigation functions
  const nextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % mediaUrls.length);
  };

  const prevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
  };

  const goToMedia = (index: number) => {
    setCurrentMediaIndex(index);
  };

  return (
    <Card className="px-3 animate-slide-up hover:shadow-md transition-shadow rounded-none">
      <div className="flex items-start gap-3 pt-3">
        {/* Clickable Avatar */}
        <div onClick={handleAvatarClick} className="cursor-pointer">
          <Avatar className="h-8 w-8 hover:opacity-80 transition-opacity">
            {post.profiles.avatar_url ? (
              <img 
                src={post.profiles.avatar_url}  
                alt={post.profiles.full_name || "User Avatar"}
              />
            ) : ( 
              <AvatarFallback>
                {post.profiles.full_name
                  ? post.profiles.full_name.charAt(0).toUpperCase()
                  : "U"}
              </AvatarFallback>
            )}
          </Avatar>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-1 text-sm">
            {/* Clickable Username */}
            <span 
              className="font-semibold cursor-pointer hover:underline"
              onClick={handleAvatarClick}
            >
              {post.profiles.full_name || "Anonymous"}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
            {post.location && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{post.location}</span>
              </>
            )}
          </div>
        </div>
        {currentUserId === post.user_id && (
         <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={(e) => handleDelete(e)}
        className="text-destructive hover:text-destructive h-6 w-6 p-0"
      >
  <Trash2 className="h-3 w-3" />
</Button>

        )}
      </div>

      {post.content && (
        <p className="mb-2 pt-2 whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
      )}

      {/* Media Carousel - Supports multiple images/videos */}
      {hasMedia && post.post_type !== "poll" && (
        <div className="relative mb-2 pt-2 group">
          {/* Main Media Display */}
          <div className="relative w-full">
            {isVideoUrl(mediaUrls[currentMediaIndex]) ? (
              <video
                key={currentMediaIndex}
                src={mediaUrls[currentMediaIndex]}
                controls
                className="rounded-none w-full h-auto object-contain max-h-[600px] bg-black"
                preload="metadata"
              />
            ) : (
              <img
                src={mediaUrls[currentMediaIndex]}
                alt={`Media ${currentMediaIndex + 1}`}
                className="rounded-none w-full h-auto object-contain max-h-[600px] bg-black"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            )}

            {/* Navigation Buttons - Only show if multiple media */}
            {mediaUrls.length > 1 && (
              <>
                {/* Previous Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevMedia}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                {/* Next Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextMedia}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>

                {/* Media Counter */}
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {currentMediaIndex + 1} / {mediaUrls.length}
                </div>
              </>
            )}
          </div>

          {/* Carousel Indicators - Only show if multiple media */}
          {mediaUrls.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-2">
              {mediaUrls.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToMedia(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentMediaIndex
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  aria-label={`Go to media ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Poll */}
      {post.post_type === "poll" && pollOptions.length > 0 && (
        <div className="space-y-2 mb-2 pt-2">
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

      <div className="flex items-center gap-3 pt-1 pb-1 border-t">
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
          onClick={() => {
            if (!currentUserId) {
              window.location.href = "/auth";
              return;
            }
            setShowComments(!showComments);
          }}
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          {commentCount}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>

      </div>

      {showComments && currentUserId && (
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