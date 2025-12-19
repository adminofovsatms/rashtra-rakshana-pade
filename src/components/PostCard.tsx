import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Heart, MessageCircle, Share2, Trash2, ChevronLeft, ChevronRight, ExternalLink, Copy, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import PostComments from "./PostComments";

interface LinkPreview {
  url: string;
  display_url: string;
  title: string;
  description: string;
  image: string;
  domain: string;
  card_type: string;
}

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    content: string | null;
    post_type: string;
    media_url: string | string[] | null;
    created_at: string;
    location?: string | null;
    link_preview?: LinkPreview | null;
    profiles: {
      full_name: string | null;
      avatar_url: string | null;
    };
  };
  currentUserId?: string;
  isMuted: boolean;
  onMuteToggle: (muted: boolean) => void;
  onPostDeleted?: () => void;
  isDetailView?: boolean;
}

const PostCard = ({ post, currentUserId, isMuted, onMuteToggle, onPostDeleted, isDetailView = false }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [pollOptions, setPollOptions] = useState<any[]>([]);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const delete_api = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    fetchReactions();
    fetchCommentCount();
    
    if (post.post_type === "poll") {
      fetchPollData();
    }
  }, [post.id, currentUserId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(err => console.log('Autoplay prevented:', err));
          } else {
            video.pause();
          }
        });
      },
      {
        threshold: 0.5,
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [currentMediaIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVolumeChange = () => {
      if (video.muted !== isMuted) {
        onMuteToggle(video.muted);
      }
    };

    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [isMuted, onMuteToggle]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from("post_reactions")
      .select("*")
      .eq("post_id", post.id)
      .eq("reaction_type", "like");

    setLikeCount(data?.length || 0);
    setLiked(currentUserId ? data?.some((r) => r.user_id === currentUserId) || false : false);
  };

  function decodeHtmlEntities(text: string) {
    const txt = document.createElement("textarea");
    txt.innerHTML = text;
    return txt.value;
  }

  function linkify(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  }

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

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
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

  const handleVote = async (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId || currentUserId !== post.user_id) return;

    try {
      if (post.media_url) {
        const mediaUrls = Array.isArray(post.media_url)
          ? post.media_url
          : [post.media_url];
        
        await fetch(delete_api+'/delete-media', {
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

      onPostDeleted?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const postUrl = `${window.location.origin}/post/${post.id}`;
    
    try {
      await navigator.clipboard.writeText(postUrl);
      setLinkCopied(true);
      toast({
        title: "Link copied!",
        description: "Post link copied to clipboard",
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => setLinkCopied(false), 2000);
      
      // Close popover after copying
      setTimeout(() => setSharePopoverOpen(false), 1000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const shareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    
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
    setSharePopoverOpen(false);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!currentUserId) {
      window.location.href = "/auth";
      return;
    }

    if (currentUserId === post.user_id) {
      navigate("/profile");
    } else {
      navigate(`/user/${post.user_id}`);
    }
  };

  const isVideoUrl = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext));
  };

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

  const nextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIndex((prev) => (prev + 1) % mediaUrls.length);
  };

  const prevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
  };

  const goToMedia = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIndex(index);
  };

  return (
    <Card className="px-3 animate-slide-up hover:shadow-md transition-shadow rounded-none">
      <div className="flex items-start gap-3 pt-3">
        <div onClick={handleAvatarClick}>
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
            onClick={handleDelete}
            className="text-destructive hover:text-destructive h-6 w-6 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {post.content && (
        <p className="mb-2 pt-2 whitespace-pre-wrap text-sm leading-relaxed">
          {linkify(decodeHtmlEntities(post.content))}
        </p>
      )}

      {hasMedia && post.post_type !== "poll" && (
        <div className="relative mb-2 pt-2 group" onClick={(e) => e.stopPropagation()}>
          <div className="relative w-full">
            {isVideoUrl(mediaUrls[currentMediaIndex]) ? (
              <video
                ref={videoRef}
                key={currentMediaIndex}
                src={mediaUrls[currentMediaIndex]}
                controls
                muted={isMuted}
                loop
                playsInline
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

            {mediaUrls.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevMedia}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextMedia}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>

                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {currentMediaIndex + 1} / {mediaUrls.length}
                </div>
              </>
            )}
          </div>

          {mediaUrls.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-2">
              {mediaUrls.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => goToMedia(index, e)}
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

      {post.link_preview && (
        <a
          href={post.link_preview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-2 border border-gray-200 rounded-xl overflow-hidden hover:bg-gray-50 transition-colors group"
          onClick={(e) => e.stopPropagation()}
        >
          {post.link_preview.image && (
            <div className="relative w-full bg-gray-100">
              <img
                src={post.link_preview.image}
                alt={post.link_preview.title}
                className="w-full h-auto object-cover max-h-[400px]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="p-3">
            <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:underline">
              {post.link_preview.title}
            </h3>

            {post.link_preview.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {post.link_preview.description}
              </p>
            )}

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span>{post.link_preview.domain}</span>
            </div>
          </div>
        </a>
      )}

      {post.post_type === "poll" && pollOptions.length > 0 && (
        <div className="space-y-2 mb-2 pt-2" onClick={(e) => e.stopPropagation()}>
          {pollOptions.map((option) => {
            const voteCount = option.poll_votes?.[0]?.count || 0;
            const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
            const isUserVote = userVote === option.id;

            return (
              <Button
                key={option.id}
                variant={isUserVote ? "default" : "outline"}
                className="w-full justify-start relative overflow-hidden"
                onClick={(e) => handleVote(option.id, e)}
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

      <div className="flex items-center gap-3 pt-1 pb-1 border-t" onClick={(e) => e.stopPropagation()}>
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
          onClick={(e) => {
            e.stopPropagation();
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
        
        <Popover open={sharePopoverOpen} onOpenChange={setSharePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (!currentUserId) {
                  navigate("/auth");
                  return;
                }
              }}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={copyLink}
              >
                {linkCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-green-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={shareWhatsApp}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share on WhatsApp
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {showComments && currentUserId && (
        <div onClick={(e) => e.stopPropagation()}>
          <PostComments
            postId={post.id}
            currentUserId={currentUserId}
            onCommentAdded={fetchCommentCount}
          />
        </div>
      )}
    </Card>
  );
};

export default PostCard;