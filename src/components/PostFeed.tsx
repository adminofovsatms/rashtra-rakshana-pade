import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PostCard from "./PostCard";
import { Loader2 } from "lucide-react";
import { EventCard } from "./EventCard";


interface Post {
  id: string;
  user_id: string;
  content: string | null;
  post_type: string;
  media_url: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
  twitter_username: string | null;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  location: string | null;
  event_date: string;
  created_at: string;
  created_by: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

type FeedItem = 
  | { type: 'post'; data: Post }
  | { type: 'event'; data: Event };

interface PostFeedProps {
  userId?: string;
}

const PostFeed = ({ userId }: PostFeedProps) => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const ITEMS_PER_PAGE = 10;

  // Load mute preference from localStorage on mount
  useEffect(() => {
    const savedMuteState = localStorage.getItem('videoMuted');
    if (savedMuteState !== null) {
      setIsMuted(savedMuteState === 'true');
    }
  }, []);

  // Handle mute toggle from any video
  const handleMuteToggle = (muted: boolean) => {
    setIsMuted(muted);
    localStorage.setItem('videoMuted', String(muted));
  };

  useEffect(() => {
    fetchFeed(0, true);

    const postsChannel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts"
        },
        () => {
          fetchFeed(0, true);
        }
      )
      .subscribe();

    const eventsChannel = supabase
      .channel("events-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events"
        },
        () => {
          fetchFeed(0, true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loadingMore, loading]);

  const fetchFeed = async (pageNum: number, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(0);
      } else {
        setLoadingMore(true);
      }

      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (postsError) throw postsError;
          
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (eventsError) throw eventsError;
          
      const combined: FeedItem[] = [
        ...(postsData || []).map(post => ({ type: 'post' as const, data: post })),
        ...(eventsData || []).map(event => ({ type: 'event' as const, data: event }))
      ];

      combined.sort((a, b) => 
        new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
      );

      const pageItems = combined.slice(0, ITEMS_PER_PAGE);

      if (reset) {
        setFeedItems(pageItems);
        setPage(1);
      } else {
        setFeedItems(prev => [...prev, ...pageItems]);
        setPage(pageNum + 1);
      }

      setHasMore(pageItems.length === ITEMS_PER_PAGE);

    } catch (error: any) {
      toast({
        title: "Error loading feed",
        description: error.message,
        variant: "destructive",
        duration: 1000
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchFeed(page);
    }
  }, [page, loadingMore, hasMore]);

  if (loading) {
    return (
      <div>
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="bg-card px-3 rounded-none animate-pulse h-48" />
            {i < 3 && <div className="border-b border-black/20"></div>}
          </div>
        ))}
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No posts yet. Be the first to share something!</p>
      </div>
    );
  }

  return (
    <div>
      {feedItems.map((item, index) => (
        <div key={item.type === 'post' ? `post-${item.data.id}` : `event-${item.data.id}`}>
          {item.type === 'post' ? (
            <PostCard 
              post={item.data} 
              currentUserId={userId}
              isMuted={isMuted}
              onMuteToggle={handleMuteToggle}
              onPostDeleted={() => {
                setFeedItems(prev => prev.filter(f => f.type !== 'post' || f.data.id !== item.data.id));
              }}
      />) : ( 
            <EventCard
              event={item.data}
              currentUserId={userId}
              onEventDeleted={() => fetchFeed(0, true)}
            />
          )}
          {index < feedItems.length - 1 && (
            <div className="border-b border-black/20"></div>
          )}
        </div>
      ))}
      
      <div ref={observerTarget} className="py-4">
        {loadingMore && (
          <div className="flex justify-center items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more posts...</span>
          </div>
        )}
        {!hasMore && feedItems.length > 0 && (
          <div className="text-center text-muted-foreground py-4">
            <p>You've reached the end of the feed</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostFeed;