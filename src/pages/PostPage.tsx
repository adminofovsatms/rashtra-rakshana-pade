import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PostCard from "@/components/PostCard";
import { Loader2 } from "lucide-react";

const PostPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchPost();
    
    const savedMuteState = localStorage.getItem('videoMuted');
    if (savedMuteState !== null) {
      setIsMuted(savedMuteState === 'true');
    }
  }, [postId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id);
  };

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq("id", postId)
        .single();

      if (error) throw error;
      setPost(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Post not found",
        variant: "destructive",
        duration: 1000
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleMuteToggle = (muted: boolean) => {
    setIsMuted(muted);
    localStorage.setItem('videoMuted', String(muted));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-2 py-2">
          <h1 
            className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            Hindu Unity
          </h1>
        </div>
      </header>

      <div className="container mx-auto max-w-2xl">
        <PostCard
          post={post}
          currentUserId={currentUserId}
          isMuted={isMuted}
          onMuteToggle={handleMuteToggle}
          onPostDeleted={() => navigate("/")}
          isDetailView={true}
        />
      </div>
    </div>
  );
};

export default PostPage;