// UserProfile.tsx - Modified version

import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Loader2, ShieldCheck } from "lucide-react";
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
  user_pinned?: boolean;
  user_pinned_at?: string | null;
  admin_pinned?: boolean;
  admin_pinned_at?: string | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isClaimable, setIsClaimable] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState<string | null>(null);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if we came from manage-users page
  const fromManageUsers = location.state?.from === '/manage-users';

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

  useEffect(() => {
    checkCurrentUser();
    if (userId) {
      fetchUserProfile();
      fetchUserPosts();
      fetchFollowCounts();
      checkIfClaimable();
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
      if (user.id === userId) {
        navigate("/profile");
        return;
      }
    }
  };

  const checkIfClaimable = async () => {
    try {
      const { data, error } = await supabase
        .from("twitter_id_map")
        .select("claimed, username")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data && data.claimed === false) {
        setIsClaimable(true);
        setTwitterUsername(data.username);
      }
    } catch (error: any) {
      console.error("Error checking claim status:", error);
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
          variant: "destructive",
          duration: 1000
        });
        navigate("/");
        return;
      }

      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 1000
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
        .order("user_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPosts(data || []);
    } catch (error: any) {
      console.error("Error fetching posts:", error);
    }
  };

  const fetchFollowCounts = async () => {
    try {
      const { count: followersCount, error: followersError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId);

      if (followersError) throw followersError;

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
        description: `You are now following ${profile?.full_name || "this user"}`,
        duration: 1000
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 1000
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
        description: `You have unfollowed ${profile?.full_name || "this user"}`,
        duration: 1000
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 1000
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

  const handleBack = () => {
    if (fromManageUsers) {
      navigate('/manage-users');
    } else {
      navigate(-1);
    }
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
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-2 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {profile.full_name || "User Profile"}
            </h1>
          </div>
          {fromManageUsers && (
            <Badge variant="outline" className="text-xs">
              From Manage Users
            </Badge>
          )}
        </div>
      </header>

      <main className="container mx-auto px-2 py-2 max-w-2xl">
        <div className="space-y-2">
          <Card className="p-3">
            <div className="flex items-start gap-2">
              <Avatar className="h-14 w-14 flex-shrink-0">
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name || "User"} />
                ) : null}
                <AvatarFallback className="text-lg">
                  {profile.full_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold truncate">
                    {profile.full_name || "Anonymous"}
                  </h2>
                  <Badge variant={getRoleBadgeVariant(profile.role)} className="text-xs">
                    {formatRole(profile.role)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Member since {new Date(profile.created_at).toLocaleDateString()}
                </p>

                <div className="flex items-center gap-3 mb-2">
                  <div className="text-xs">
                    <span className="font-bold">{followersCount}</span>{" "}
                    <span className="text-muted-foreground">
                      {followersCount === 1 ? "Follower" : "Followers"}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="font-bold">{followingCount}</span>{" "}
                    <span className="text-muted-foreground">Following</span>
                  </div>
                </div>
                
                {profile.bio && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-foreground whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  </div>
                )}

                {currentUserId && (
                  <div className="mt-2 pt-2 border-t space-y-2">
                    {isFollowing ? (
                      <Button 
                        className="w-full h-8 text-xs" 
                        variant="outline"
                        onClick={handleUnfollow}
                        disabled={followLoading}
                      >
                        {followLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Unfollowing...
                          </>
                        ) : (
                          "Unfollow"
                        )}
                      </Button>
                    ) : (
                      <Button 
                        className="w-full h-8 text-xs" 
                        variant="default"
                        onClick={handleFollow}
                        disabled={followLoading}
                      >
                        {followLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Following...
                          </>
                        ) : (
                          "Follow"
                        )}
                      </Button>
                    )}

                    {isClaimable && (
                      <Button
                        className="w-full h-8 text-xs"
                        variant="secondary"
                        onClick={() => setShowClaimDialog(true)}
                      >
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Claim Account as Mine
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-semibold">Posts</h3>
              <Badge variant="secondary" className="text-xs">{posts.length}</Badge>
            </div>

            {posts.length === 0 ? (
              <Card className="p-8 text-center">
                <User className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                <h3 className="text-sm font-semibold mb-1">No Posts Yet</h3>
                <p className="text-xs text-muted-foreground">
                  This user hasn't created any posts yet
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUserId || undefined}
                    isMuted={isMuted}
                    onMuteToggle={handleMuteToggle}
                    onPostDeleted={fetchUserPosts}
                    showUserPinButton={true}
                    onPinToggle={fetchUserPosts}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Claim Your Account
            </DialogTitle>
            <DialogDescription className="text-sm space-y-3 pt-2">
              <p>
                If this is your account on X (formerly Twitter), please send a direct message to{" "}
                <span className="font-semibold text-foreground">@dharmic_mandate</span> from your handle{" "}
                {twitterUsername && (
                  <span className="font-semibold text-foreground">@{twitterUsername}</span>
                )}{" "}
                for further verification instructions.
              </p>
              <p className="text-xs text-muted-foreground">
                You will receive instructions on how to verify and claim ownership of this account.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="default"
              onClick={() => setShowClaimDialog(false)}
              className="w-full"
            >
              OK, Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserProfile;