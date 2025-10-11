import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PostCard from "./PostCard";
import { ProtestCard } from "./ProtestCard";

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
  const { toast } = useToast();

  useEffect(() => {
    fetchFeed();

    const postsChannel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts"
        },
        () => {
          fetchFeed();
        }
      )
      .subscribe();

    const protestsChannel = supabase
      .channel("protests-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "protests"
        },
        () => {
          fetchFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(protestsChannel);
    };
  }, []);

  const fetchFeed = async () => {
    try {
      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      // Fetch protests
      const { data: protestsData, error: protestsError } = await supabase
        .from("protests")
        .select("*")
        .order("created_at", { ascending: false });

      if (protestsError) throw protestsError;

      // Combine and sort by created_at
      const combined: FeedItem[] = [
        ...(postsData || []).map(post => ({ type: 'post' as const, data: post })),
        ...(protestsData || []).map(protest => ({ type: 'protest' as const, data: protest }))
      ];

      combined.sort((a, b) => 
        new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
      );

      setFeedItems(combined);
    } catch (error: any) {
      toast({
        title: "Error loading feed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
            onPostDeleted={fetchFeed}
          />
        ) : (
          <ProtestCard
            key={`protest-${item.data.id}`}
            protest={item.data}
            currentUserId={userId}
          />
        )
      ))}
    </div>
  );
};

export default PostFeed;
