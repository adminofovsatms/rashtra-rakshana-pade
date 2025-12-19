// Profile.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, KeyRound, Loader2, CheckCircle, Camera, Settings, UserCog, FileText } from "lucide-react";
import PostCard from "@/components/PostCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Profile {
  id: string;
  email: string;
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

interface FollowUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [isBioDialogOpen, setIsBioDialogOpen] = useState(false);
  const [isFollowersDialogOpen, setIsFollowersDialogOpen] = useState(false);
  const [isFollowingDialogOpen, setIsFollowingDialogOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newBio, setNewBio] = useState("");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState<FollowUser[]>([]);
  const [followingList, setFollowingList] = useState<FollowUser[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const presignedUrlApi = import.meta.env.VITE_BACKEND_URL+'/api/get-avatar-upload-url';

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
    fetchProfile();
    fetchUserPosts();
  }, []);

  useEffect(() => {
    if (profile?.id) {
      fetchFollowCounts();
    }
  }, [profile?.id]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*, avatar_url, bio")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile({
        ...data,
        email: user.email || ""
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 1000
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPosts(data || []);
    } catch (error: any) {
      console.error("Error fetching posts:", error);
    }
  };

  const fetchFollowCounts = async () => {
    try {
      if (!profile?.id) return;

      const { count: followersCount, error: followersError } = await supabase
        .from("follows" as any)
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id);

      if (followersError) throw followersError;

      const { count: followingCount, error: followingError } = await supabase
        .from("follows" as any)
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id);

      if (followingError) throw followingError;

      setFollowersCount(followersCount || 0);
      setFollowingCount(followingCount || 0);
    } catch (error: any) {
      console.error("Error fetching follow counts:", error);
    }
  };

  const fetchFollowersList = async () => {
    if (!profile?.id) return;
    
    setFollowersLoading(true);
    try {
      const { data, error } = await supabase
        .from("follows" as any)
        .select(`
          follower_id,
          profiles!follows_follower_id_fkey (
            id,
            full_name,
            avatar_url,
            bio
          )
        `)
        .eq("following_id", profile.id);

      if (error) throw error;

      const followers = data?.map((item: any) => item.profiles).filter(Boolean) || [];
      setFollowersList(followers);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load followers",
        variant: "destructive",
        duration: 1000
      });
    } finally {
      setFollowersLoading(false);
    }
  };

  const fetchFollowingList = async () => {
    if (!profile?.id) return;
    
    setFollowingLoading(true);
    try {
      const { data, error } = await supabase
        .from("follows" as any)
        .select(`
          following_id,
          profiles!follows_following_id_fkey (
            id,
            full_name,
            avatar_url,
            bio
          )
        `)
        .eq("follower_id", profile.id);

      if (error) throw error;

      const following = data?.map((item: any) => item.profiles).filter(Boolean) || [];
      setFollowingList(following);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load following",
        variant: "destructive",
        duration: 1000
      });
    } finally {
      setFollowingLoading(false);
    }
  };

  const handleOpenFollowers = () => {
    setIsFollowersDialogOpen(true);
    fetchFollowersList();
  };

  const handleOpenFollowing = () => {
    setIsFollowingDialogOpen(true);
    fetchFollowingList();
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const response = await fetch(presignedUrlApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: profile?.id,
          file_type: "image",
          file_name: file.name,
          content_type: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { upload_url, public_url } = await response.json();

      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      return public_url;

    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
        duration: 1000
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
        duration: 1000
      });
      return;
    }

    setAvatarUploading(true);

    try {
      const avatarUrl = await uploadFile(file);

      if (!avatarUrl) {
        throw new Error("Failed to get avatar URL");
      }

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        avatar_url: avatarUrl
      });

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully",
        duration: 1000
      });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
        duration: 1000
      });
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical",
        variant: "destructive",
        duration: 1000
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
        duration: 1000
      });
      return;
    }

    setPasswordLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("User email not found");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed",
        duration: 1000
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 1000
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUsername.trim()) {
      toast({
        title: "Invalid username",
        description: "Username cannot be empty",
        variant: "destructive",
        duration: 1000
      });
      return;
    }

    if (newUsername.trim().length < 2) {
      toast({
        title: "Username too short",
        description: "Username must be at least 2 characters long",
        variant: "destructive",
        duration: 1000
      });
      return;
    }

    setUsernameLoading(true);

    try {
      if (!profile) throw new Error("Profile not found");

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: newUsername.trim() })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        full_name: newUsername.trim()
      });

      toast({
        title: "Username Updated",
        description: "Your username has been successfully changed",
        duration: 1000
      });

      setNewUsername("");
      setIsUsernameDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 1000
      });
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleEditBio = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newBio.length > 500) {
      toast({
        title: "Bio too long",
        description: "Bio must be 500 characters or less",
        variant: "destructive",
        duration: 1000
      });
      return;
    }

    setBioLoading(true);

    try {
      if (!profile) throw new Error("Profile not found");

      const { error } = await supabase
        .from("profiles")
        .update({ bio: newBio.trim() || null })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        bio: newBio.trim() || null
      });

      toast({
        title: "Bio Updated",
        description: "Your bio has been successfully updated",
        duration: 1000
      });

      setNewBio("");
      setIsBioDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 1000
      });
    } finally {
      setBioLoading(false);
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
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-2 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Profile
            </h1>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Account Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsUsernameDialogOpen(true)} className="text-xs">
                <UserCog className="h-3 w-3 mr-2" />
                Change Username
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsBioDialogOpen(true)} className="text-xs">
                <FileText className="h-3 w-3 mr-2" />
                Edit Bio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)} className="text-xs">
                <KeyRound className="h-3 w-3 mr-2" />
                Change Password
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="currentPassword" className="text-xs">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="newPassword" className="text-xs">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters long
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword" className="text-xs">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="h-8 text-sm"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Passwords match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-8 text-xs"
              disabled={passwordLoading || newPassword !== confirmPassword}
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Username Dialog */}
      <Dialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Change Username</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangeUsername} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="currentUsername" className="text-xs">Current Username</Label>
              <Input
                id="currentUsername"
                type="text"
                value={profile.full_name || ""}
                disabled
                className="bg-muted h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="newUsername" className="text-xs">New Username</Label>
              <Input
                id="newUsername"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                minLength={2}
                placeholder="Enter new username"
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 2 characters long
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-8 text-xs"
              disabled={usernameLoading || !newUsername.trim()}
            >
              {usernameLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Username'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Bio Dialog */}
      <Dialog open={isBioDialogOpen} onOpenChange={setIsBioDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Bio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditBio} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="currentBio" className="text-xs">Current Bio</Label>
              <Textarea
                id="currentBio"
                value={profile.bio || "No bio yet"}
                disabled
                className="bg-muted resize-none text-sm"
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="newBio" className="text-xs">New Bio</Label>
              <Textarea
                id="newBio"
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                maxLength={500}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {newBio.length}/500 characters
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-8 text-xs"
              disabled={bioLoading}
            >
              {bioLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Bio'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Followers List Dialog */}
      <Dialog open={isFollowersDialogOpen} onOpenChange={setIsFollowersDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Followers</DialogTitle>
          </DialogHeader>
          <div className="h-80">
            {followersLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : followersList.length === 0 ? (
              <div className="flex justify-center items-center h-full text-center text-muted-foreground">
                <p className="text-sm">No followers yet</p>
              </div>
            ) : (
              <div className="space-y-1 h-full overflow-y-auto pr-1">
                {followersList.map((follower) => (
                  <div
                    key={follower.id}
                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border-b border-transparent hover:border-blue-500"
                    onClick={() => {
                      navigate(`/user/${follower.id}`);
                      setIsFollowersDialogOpen(false);
                    }}
                  >
                    <Avatar className="h-10 w-10">
                      {follower.avatar_url ? (
                        <AvatarImage src={follower.avatar_url} alt={follower.full_name || "User"} />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {follower.full_name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {follower.full_name || "Anonymous"}
                      </p>
                      {follower.bio && (
                        <p className="text-xs text-muted-foreground truncate">
                          {follower.bio}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Following List Dialog */}
      <Dialog open={isFollowingDialogOpen} onOpenChange={setIsFollowingDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Following</DialogTitle>
          </DialogHeader>
          <div className="h-80">
            {followingLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : followingList.length === 0 ? (
              <div className="flex justify-center items-center h-full text-center text-muted-foreground">
                <p className="text-sm">Not following anyone yet</p>
              </div>
            ) : (
              <div className="space-y-1 h-full overflow-y-auto pr-1">
                {followingList.map((following) => (
                  <div
                    key={following.id}
                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border-b border-transparent hover:border-blue-500"
                    onClick={() => {
                      navigate(`/user/${following.id}`);
                      setIsFollowingDialogOpen(false);
                    }}
                  >
                    <Avatar className="h-10 w-10">
                      {following.avatar_url ? (
                        <AvatarImage src={following.avatar_url} alt={following.full_name || "User"} />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {following.full_name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {following.full_name || "Anonymous"}
                      </p>
                      {following.bio && (
                        <p className="text-xs text-muted-foreground truncate">
                          {following.bio}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="container mx-auto px-2 py-2 max-w-2xl">
        <div className="space-y-2">
          <Card className="p-3">
            <div className="flex items-start gap-2">
              <div className="relative">
                <Avatar className="h-14 w-14">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name || "User"} />
                  ) : null}
                  <AvatarFallback className="text-lg">
                    {profile.full_name?.[0] || profile.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-0.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  {avatarUploading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={avatarUploading}
                  className="hidden"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold truncate">
                    {profile.full_name || "Anonymous"}
                  </h2>
                  <Badge variant={getRoleBadgeVariant(profile.role)} className="text-xs">
                    {formatRole(profile.role)}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs mb-0.5">{profile.email}</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Member since {new Date(profile.created_at).toLocaleDateString()}
                </p>

                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={handleOpenFollowers}
                    className="text-xs hover:underline cursor-pointer"
                  >
                    <span className="font-bold">{followersCount}</span>{" "}
                    <span className="text-muted-foreground">
                      {followersCount === 1 ? "Follower" : "Followers"}
                    </span>
                  </button>
                  <button
                    onClick={handleOpenFollowing}
                    className="text-xs hover:underline cursor-pointer"
                  >
                    <span className="font-bold">{followingCount}</span>{" "}
                    <span className="text-muted-foreground">Following</span>
                  </button>
                </div>

                {profile.bio && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-foreground whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  </div>
                )}
                {!profile.bio && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground italic">
                      No bio yet. Click the settings icon to add one!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-semibold">Your Posts</h3>
              <Badge variant="secondary" className="text-xs">{posts.length}</Badge>
            </div>

            {posts.length === 0 ? (
              <Card className="p-8 text-center">
                <User className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                <h3 className="text-sm font-semibold mb-1">No Posts Yet</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  You haven't created any posts yet
                </p>
                <Button onClick={() => navigate("/")} size="sm" className="h-7 text-xs">
                  Create Your First Post
                </Button>
              </Card>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={profile.id}
                    isMuted={isMuted}
                    onMuteToggle={handleMuteToggle}
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

export default Profile;