import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PostCard from "./PostCard";
import { ProtestCard } from "./ProtestCard";
import { Loader2 } from "lucide-react";

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
}

interface Protest {
  id: string;
  user_id: string;
  reason: string;
  location: string;
  created_at: string;
}

type FeedItem = 
  | { type: 'post'; data: Post }
  | { type: 'protest'; data: Protest };

interface PostFeedProps {
  userId?: string;
}

const PostFeed = ({ userId }: PostFeedProps) => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const ITEMS_PER_PAGE = 5;

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
          // Reload from beginning when new posts are added
          fetchFeed(0, true);
        }
      )
      .subscribe();

    const protestsChannel = supabase
      .channel("protests-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "protests"
        },
        () => {
          // Reload from beginning when new protests are added
          fetchFeed(0, true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(protestsChannel);
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

      // Fetch posts with pagination
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

      // Fetch protests with pagination
      const { data: protestsData, error: protestsError } = await supabase
        .from("protests")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (protestsError) throw protestsError;

      // Combine and sort by created_at
      const combined: FeedItem[] = [
        ...(postsData || []).map(post => ({ type: 'post' as const, data: post })),
        ...(protestsData || []).map(protest => ({ type: 'protest' as const, data: protest }))
      ];

      combined.sort((a, b) => 
        new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
      );

      // Take only the items we need for this page
      const pageItems = combined.slice(0, ITEMS_PER_PAGE);

      if (reset) {
        setFeedItems(pageItems);
        setPage(1);
      } else {
        setFeedItems(prev => [...prev, ...pageItems]);
        setPage(pageNum + 1);
      }

      // Check if there are more items to load
      setHasMore(pageItems.length === ITEMS_PER_PAGE);

    } catch (error: any) {
      toast({
        title: "Error loading feed",
        description: error.message,
        variant: "destructive"
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
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card p-6 rounded-lg animate-pulse h-48" />
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
    <div className="space-y-4">
      {feedItems.map((item) => (
        item.type === 'post' ? (
          <PostCard 
            key={`post-${item.data.id}`}
            post={item.data} 
            currentUserId={userId} 
            onPostDeleted={() => fetchFeed(0, true)}
          />
        ) : (
          <ProtestCard
            key={`protest-${item.data.id}`}
            protest={item.data}
            currentUserId={userId}
          />
        )
      ))}
      
      {/* Infinite scroll trigger */}
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
