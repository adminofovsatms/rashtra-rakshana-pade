import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Loader2 } from "lucide-react";
import PostCard from "@/components/PostCard";

interface Profile {
  id: string;
  full_name: string | null;
  role: string;
  created_at: string;
  avatar_url: string | null;
  bio: string | null;
}

interface Post {
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
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkCurrentUser();
    if (userId) {
      fetchUserProfile();
      fetchUserPosts();
      fetchFollowCounts();
    }
  }, [userId]);

  useEffect(() => {
    if (currentUserId && userId && currentUserId !== userId) {
      checkIfFollowing();
    }
  }, [currentUserId, userId]);

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      // If viewing own profile, redirect to /profile
      if (user.id === userId) {
        navigate("/profile");
        return;
      }
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, created_at, avatar_url, bio")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          title: "User not found",
          description: "This user does not exist",
          variant: "destructive"
        });
        navigate("/");
        return;
      }

      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
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
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPosts(data || []);
    } catch (error: any) {
      console.error("Error fetching posts:", error);
    }
  };

  const fetchFollowCounts = async () => {
    try {
      // Get followers count (people following this user)
      const { count: followersCount, error: followersError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId);

      if (followersError) throw followersError;

      // Get following count (people this user follows)
      const { count: followingCount, error: followingError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId);

      if (followingError) throw followingError;

      setFollowersCount(followersCount || 0);
      setFollowingCount(followingCount || 0);
    } catch (error: any) {
      console.error("Error fetching follow counts:", error);
    }
  };

  const checkIfFollowing = async () => {
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", currentUserId)
        .eq("following_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" error, which is fine
        throw error;
      }

      setIsFollowing(!!data);
    } catch (error: any) {
      console.error("Error checking follow status:", error);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId) {
      navigate("/auth");
      return;
    }

    setFollowLoading(true);

    try {
      const { error } = await supabase
        .from("follows")
        .insert({
          follower_id: currentUserId,
          following_id: userId
        });

      if (error) throw error;

      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);

      toast({
        title: "Following",
        description: `You are now following ${profile?.full_name || "this user"}`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUserId) {
      navigate("/auth");
      return;
    }

    setFollowLoading(true);

    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", userId);

      if (error) throw error;

      setIsFollowing(false);
      setFollowersCount(prev => Math.max(0, prev - 1));

      toast({
        title: "Unfollowed",
        description: `You have unfollowed ${profile?.full_name || "this user"}`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "default";
      case "executive":
        return "secondary";
      case "volunteer":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatRole = (role: string) => {
    return role.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {profile.full_name || "User Profile"}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Profile Info Card */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name || "User"} />
                ) : null}
                <AvatarFallback className="text-2xl">
                  {profile.full_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">
                    {profile.full_name || "Anonymous"}
                  </h2>
                  <Badge variant={getRoleBadgeVariant(profile.role)}>
                    {formatRole(profile.role)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Member since {new Date(profile.created_at).toLocaleDateString()}
                </p>

                {/* Follower/Following Stats */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="text-sm">
                    <span className="font-bold">{followersCount}</span>{" "}
                    <span className="text-muted-foreground">
                      {followersCount === 1 ? "Follower" : "Followers"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold">{followingCount}</span>{" "}
                    <span className="text-muted-foreground">Following</span>
                  </div>
                </div>
                
                {/* Bio Section */}
                {profile.bio && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  </div>
                )}
                {!profile.bio && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground italic">
                      No bio yet
                    </p>
                  </div>
                )}

                {/* Follow/Unfollow Button */}
                {currentUserId && (
                  <div className="mt-4 pt-4 border-t">
                    {isFollowing ? (
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={handleUnfollow}
                        disabled={followLoading}
                      >
                        {followLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Unfollowing...
                          </>
                        ) : (
                          "Unfollow"
                        )}
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        variant="default"
                        onClick={handleFollow}
                        disabled={followLoading}
                      >
                        {followLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Following...
                          </>
                        ) : (
                          "Follow"
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Posts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Posts</h3>
              <Badge variant="secondary">{posts.length} posts</Badge>
            </div>

            {posts.length === 0 ? (
              <Card className="p-12 text-center">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Posts Yet</h3>
                <p className="text-muted-foreground">
                  This user hasn't created any posts yet
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUserId || undefined}
                    onPostDeleted={fetchUserPosts}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;