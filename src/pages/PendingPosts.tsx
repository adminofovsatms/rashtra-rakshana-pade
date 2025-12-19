//pending posts 

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TweetCard from "@/components/TweetCard";

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

const PendingPosts = () => {
  const [posts, setPosts] = useState<TwitterPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkSuperAdmin();
    fetchPendingPosts();
  }, []);

  useEffect(() => {
    const savedMuteState = localStorage.getItem('videoMuted');
    if (savedMuteState !== null) {
      setIsMuted(savedMuteState === 'true');
    }
  }, []);

  const handleMuteToggle = (muted: boolean) => {
    setIsMuted(muted);
    localStorage.setItem('videoMuted', String(muted));
  };

  const checkSuperAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = roles?.map(r => r.role) || [];
    if (!userRoles.includes("super_admin")) {
      navigate("/");
    }
  };

  const fetchPendingPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("twitter_posts")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPosts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch pending posts",
        variant: "destructive",
        duration: 1000
      });
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (post: TwitterPost) => {
    setProcessingId(post.twitter_unique_id);

    try {
      const { error: updateError } = await (supabase as any)
        .from("twitter_posts")
        .update({ status: "accepted" })
        .eq("twitter_unique_id", post.twitter_unique_id);

      if (updateError) throw updateError;

      const postData = {
        user_id: post.user_id,
        content: post.content,
        post_type: post.post_type,
        media_url: post.media_url,
        twitter_unique_id: post.twitter_unique_id,
        twitter_username: post.twitter_username,
        source: post.source,
        location: post.location,
        link_preview: post.link_preview,
      };

      const { error: insertError } = await (supabase as any)
        .from("posts")
        .insert(postData);

      if (insertError) throw insertError;

      toast({
        title: "Post Accepted",
        description: "The post has been approved and published successfully.",
        duration: 1000
      });

      setPosts((prev) =>
        prev.filter((p) => p.twitter_unique_id !== post.twitter_unique_id)
      );
    } catch (error: any) {
      console.error("Error accepting post:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept the post.",
        variant: "destructive",
        duration: 1000
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (post: TwitterPost) => {
    setProcessingId(post.twitter_unique_id);

    try {
      const { error } = await (supabase as any)
        .from("twitter_posts")
        .update({ status: "rejected" })
        .eq("twitter_unique_id", post.twitter_unique_id);

      if (error) throw error;

      toast({
        title: "Post Rejected",
        description: "The post has been rejected.",
        duration: 1000
      });

      setPosts((prev) =>
        prev.filter((p) => p.twitter_unique_id !== post.twitter_unique_id)
      );
    } catch (error: any) {
      console.error("Error rejecting post:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject the post.",
        variant: "destructive",
        duration: 1000
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-2 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Pending Posts Review
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {posts.length} Pending
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPendingPosts}
              disabled={loading}
              className="h-7 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 py-2 max-w-2xl">
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading pending posts...</p>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
              <h2 className="text-lg font-semibold mb-1">All Caught Up!</h2>
              <p className="text-sm text-muted-foreground mb-3">
                There are no pending posts to review at the moment.
              </p>
              <Button onClick={fetchPendingPosts} variant="outline" size="sm" className="h-7 text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                Check Again
              </Button>
            </Card>
          ) : (
            <>
              <Card className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  <strong>Review Mode:</strong> Carefully review each post before accepting or rejecting.
                  Accepted posts will be published to the main feed.
                </p>
              </Card>

              {posts.map((post) => (
                <TweetCard
                  key={post.twitter_unique_id}
                  post={post}
                  isMuted={isMuted}
                  onMuteToggle={handleMuteToggle}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  processingId={processingId}
                />
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PendingPosts;