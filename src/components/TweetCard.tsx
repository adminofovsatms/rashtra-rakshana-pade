import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Twitter, MapPin, Loader2, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LinkPreview {
  url: string;
  display_url: string;
  title: string;
  description: string;
  image: string;
  domain: string;
  card_type: string;
}

interface TwitterPost {
  twitter_unique_id: string;
  user_id: string;
  content: string;
  post_type: string;
  media_url: string[] | null;
  twitter_username: string;
  source: string;
  location: string | null;
  status: string;
  created_at: string;
  link_preview: LinkPreview | null;
}

interface TweetCardProps {
  post: TwitterPost;
  isMuted: boolean;
  onMuteToggle: (muted: boolean) => void;
  onAccept: (post: TwitterPost) => void;
  onReject: (post: TwitterPost) => void;
  processingId: string | null;
}

const TweetCard = ({ post, isMuted, onMuteToggle, onAccept, onReject, processingId }: TweetCardProps) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Helper function to determine if URL is video
  const isVideoUrl = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext));
  };

  const mediaUrls = post.media_url || [];
  const hasMedia = mediaUrls.length > 0;
  const isProcessing = processingId === post.twitter_unique_id;

  // Auto-play video when in viewport
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Video is in viewport - play
            video.play().catch(err => console.log('Autoplay prevented:', err));
          } else {
            // Video is out of viewport - pause
            video.pause();
          }
        });
      },
      {
        threshold: 0.5, // 50% of video must be visible
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [currentMediaIndex]); // Re-run when media changes

  // Listen for volume changes and sync mute state with parent
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVolumeChange = () => {
      // When user manually changes mute state via video controls
      if (video.muted !== isMuted) {
        onMuteToggle(video.muted);
      }
    };

    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [isMuted, onMuteToggle]);

  // Carousel navigation functions
  const nextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % mediaUrls.length);
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
            >
              {part}
            </a>
          );
        }
        return part;
      });
    }


  const prevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
  };

  const goToMedia = (index: number) => {
    setCurrentMediaIndex(index);
  };

  return (
    <Card className="px-3 animate-slide-up hover:shadow-md transition-shadow rounded-none">
      {/* Header */}
      <div className="flex items-start gap-3 pt-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-blue-500/10">
            <Twitter className="h-4 w-4 text-blue-500" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-1 text-sm">
            <span className="font-semibold">@{post.twitter_username}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
            {post.location && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {post.location}
                </span>
              </>
            )}
          </div>
        </div>
        <Badge variant="secondary">{post.post_type}</Badge>
      </div>

      {/* Content */}      
      {post.content && (
        <p className="mb-2 pt-2 whitespace-pre-wrap text-sm leading-relaxed">
          {linkify(decodeHtmlEntities(post.content))}
        </p>
      )}

      

      {/* Media Carousel */}
      {hasMedia && (
        <div className="relative mb-2 pt-2 group">
          {/* Main Media Display */}
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

          {/* Carousel Indicators */}
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

      {/* Link Preview Card */}
      {post.link_preview && (
        <a
          href={post.link_preview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-2 border border-gray-200 rounded-xl overflow-hidden hover:bg-gray-50 transition-colors group"
        >
          {/* Preview Image */}
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

          {/* Preview Content */}
          <div className="p-3">
            {/* Title */}
            <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:underline">
              {post.link_preview.title}
            </h3>

            {/* Description */}
            {post.link_preview.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {post.link_preview.description}
              </p>
            )}

            {/* Domain with external link icon */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span>{post.link_preview.domain}</span>
            </div>
          </div>
        </a>
      )}

      {/* Metadata */}
      <div className="pt-2 pb-2 border-t border-b text-xs text-muted-foreground">
        <div className="flex items-center gap-4 flex-wrap">
          <span>Tweet ID: {post.twitter_unique_id}</span>
          <span>Source: {post.source}</span>
          <span>User: {post.user_id.substring(0, 8)}...</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-3 pb-3">
        <Button
          onClick={() => onAccept(post)}
          disabled={isProcessing}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          Accept & Publish
        </Button>
        <Button
          onClick={() => onReject(post)}
          disabled={isProcessing}
          variant="destructive"
          className="flex-1"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <XCircle className="h-4 w-4 mr-2" />
          )}
          Reject
        </Button>
      </div>
    </Card>
  );
};

export default TweetCard;