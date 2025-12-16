import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TweetCard from "@/components/TweetCard";

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
}

const PendingPosts = () => {
  const [posts, setPosts] = useState<TwitterPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkSuperAdmin();
    fetchPendingPosts();
  }, []);

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
      });
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (post: TwitterPost) => {
    setProcessingId(post.twitter_unique_id);

    try {
      // Update status in twitter_posts table
      const { error: updateError } = await (supabase as any)
        .from("twitter_posts")
        .update({ status: "accepted" })
        .eq("twitter_unique_id", post.twitter_unique_id);

      if (updateError) throw updateError;

      // Prepare complete data for posts table
      const postData = {
        user_id: post.user_id,
        content: post.content,
        post_type: post.post_type,
        media_url: post.media_url,
        twitter_unique_id: post.twitter_unique_id,
        twitter_username: post.twitter_username,
        source: post.source,
        location: post.location,
      };

      // Insert into posts table
      const { error: insertError } = await (supabase as any)
        .from("posts")
        .insert(postData);

      if (insertError) throw insertError;

      toast({
        title: "Post Accepted",
        description: "The post has been approved and published successfully.",
      });

      // Remove from local state
      setPosts((prev) =>
        prev.filter((p) => p.twitter_unique_id !== post.twitter_unique_id)
      );
    } catch (error: any) {
      console.error("Error accepting post:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept the post.",
        variant: "destructive",
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
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header - Similar to Feed */}
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Pending Posts Review
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {posts.length} Pending
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPendingPosts}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Similar to Feed layout */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading pending posts...</p>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-semibold mb-2">All Caught Up!</h2>
              <p className="text-muted-foreground mb-4">
                There are no pending posts to review at the moment.
              </p>
              <Button onClick={fetchPendingPosts} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Again
              </Button>
            </Card>
          ) : (
            <>
              {/* Info Banner */}
              <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Review Mode:</strong> Carefully review each post before accepting or rejecting.
                  Accepted posts will be published to the main feed.
                </p>
              </Card>

              {/* Tweet Cards Feed */}
              {posts.map((post) => (
                <TweetCard
                  key={post.twitter_unique_id}
                  post={post}
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