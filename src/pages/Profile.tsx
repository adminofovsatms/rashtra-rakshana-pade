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
import { ArrowLeft, User, KeyRound, Loader2, CheckCircle, Camera, Settings, UserCog, FileText, X } from "lucide-react";
import PostCard from "@/components/PostCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  const navigate = useNavigate();
  const { toast } = useToast();

  const presignedUrlApi = "http://localhost:5001/api/get-upload-url";

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
        variant: "destructive"
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

      // Get followers count (people following me)
      const { count: followersCount, error: followersError } = await supabase
        .from("follows" as any)
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id);

      if (followersError) throw followersError;

      // Get following count (people I follow)
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
      // Get followers with their profile info
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

      // Extract profile data from nested structure
      const followers = data?.map((item: any) => item.profiles).filter(Boolean) || [];
      setFollowersList(followers);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load followers",
        variant: "destructive"
      });
    } finally {
      setFollowersLoading(false);
    }
  };

  const fetchFollowingList = async () => {
    if (!profile?.id) return;
    
    setFollowingLoading(true);
    try {
      // Get following with their profile info
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

      // Extract profile data from nested structure
      const following = data?.map((item: any) => item.profiles).filter(Boolean) || [];
      setFollowingList(following);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load following",
        variant: "destructive"
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
      // Step 1: Get presigned URL from backend
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

      // Step 2: Upload file directly to S3 using presigned URL
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

      // Step 3: Return public URL for database
      return public_url;

    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setAvatarUploading(true);

    try {
      // Upload to S3
      const avatarUrl = await uploadFile(file);

      if (!avatarUrl) {
        throw new Error("Failed to get avatar URL");
      }

      // Update profile in Supabase
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", profile.id);

      if (error) throw error;

      // Update local state
      setProfile({
        ...profile,
        avatar_url: avatarUrl
      });

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully"
      });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload avatar",
        variant: "destructive"
      });
    } finally {
      setAvatarUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical",
        variant: "destructive"
      });
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    setPasswordLoading(true);

    try {
      // First, verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("User email not found");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      // If current password is correct, update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed"
      });

      // Reset form and close dialog
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate username
    if (!newUsername.trim()) {
      toast({
        title: "Invalid username",
        description: "Username cannot be empty",
        variant: "destructive"
      });
      return;
    }

    if (newUsername.trim().length < 2) {
      toast({
        title: "Username too short",
        description: "Username must be at least 2 characters long",
        variant: "destructive"
      });
      return;
    }

    setUsernameLoading(true);

    try {
      if (!profile) throw new Error("Profile not found");

      // Update username in profiles table
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: newUsername.trim() })
        .eq("id", profile.id);

      if (error) throw error;

      // Update local state
      setProfile({
        ...profile,
        full_name: newUsername.trim()
      });

      toast({
        title: "Username Updated",
        description: "Your username has been successfully changed"
      });

      // Reset form and close dialog
      setNewUsername("");
      setIsUsernameDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleEditBio = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate bio length
    if (newBio.length > 500) {
      toast({
        title: "Bio too long",
        description: "Bio must be 500 characters or less",
        variant: "destructive"
      });
      return;
    }

    setBioLoading(true);

    try {
      if (!profile) throw new Error("Profile not found");

      // Update bio in profiles table
      const { error } = await supabase
        .from("profiles")
        .update({ bio: newBio.trim() || null })
        .eq("id", profile.id);

      if (error) throw error;

      // Update local state
      setProfile({
        ...profile,
        bio: newBio.trim() || null
      });

      toast({
        title: "Bio Updated",
        description: "Your bio has been successfully updated"
      });

      // Reset form and close dialog
      setNewBio("");
      setIsBioDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
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
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Profile
            </h1>
          </div>
          
          {/* Settings Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Account Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsUsernameDialogOpen(true)}>
                <UserCog className="h-4 w-4 mr-2" />
                Change Username
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsBioDialogOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Edit Bio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)}>
                <KeyRound className="h-4 w-4 mr-2" />
                Change Password
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Passwords match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={passwordLoading || newPassword !== confirmPassword}
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Username</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangeUsername} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentUsername">Current Username</Label>
              <Input
                id="currentUsername"
                type="text"
                value={profile.full_name || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newUsername">New Username</Label>
              <Input
                id="newUsername"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                minLength={2}
                placeholder="Enter new username"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 2 characters long
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={usernameLoading || !newUsername.trim()}
            >
              {usernameLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditBio} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentBio">Current Bio</Label>
              <Textarea
                id="currentBio"
                value={profile.bio || "No bio yet"}
                disabled
                className="bg-muted resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newBio">New Bio</Label>
              <Textarea
                id="newBio"
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {newBio.length}/500 characters
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={bioLoading}
            >
              {bioLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Followers</DialogTitle>
          </DialogHeader>
          <div className="h-96">
            {followersLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : followersList.length === 0 ? (
              <div className="flex justify-center items-center h-full text-center text-muted-foreground">
                <p>No followers yet</p>
              </div>
            ) : (
              <div className="space-y-2 h-full overflow-y-auto pr-2">
                {followersList.map((follower) => (
                  <div
                    key={follower.id}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border-b-2 border-transparent hover:border-blue-500"
                    onClick={() => {
                      navigate(`/user/${follower.id}`);
                      setIsFollowersDialogOpen(false);
                    }}
                  >
                    <Avatar className="h-12 w-12">
                      {follower.avatar_url ? (
                        <AvatarImage src={follower.avatar_url} alt={follower.full_name || "User"} />
                      ) : null}
                      <AvatarFallback>
                        {follower.full_name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {follower.full_name || "Anonymous"}
                      </p>
                      {follower.bio && (
                        <p className="text-sm text-muted-foreground truncate">
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Following</DialogTitle>
          </DialogHeader>
          <div className="h-96">
            {followingLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : followingList.length === 0 ? (
              <div className="flex justify-center items-center h-full text-center text-muted-foreground">
                <p>Not following anyone yet</p>
              </div>
            ) : (
              <div className="space-y-2 h-full overflow-y-auto pr-2">
                {followingList.map((following) => (
                  <div
                    key={following.id}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border-b-2 border-transparent hover:border-blue-500"
                    onClick={() => {
                      navigate(`/user/${following.id}`);
                      setIsFollowingDialogOpen(false);
                    }}
                  >
                    <Avatar className="h-12 w-12">
                      {following.avatar_url ? (
                        <AvatarImage src={following.avatar_url} alt={following.full_name || "User"} />
                      ) : null}
                      <AvatarFallback>
                        {following.full_name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {following.full_name || "Anonymous"}
                      </p>
                      {following.bio && (
                        <p className="text-sm text-muted-foreground truncate">
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
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Profile Info Card */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name || "User"} />
                  ) : null}
                  <AvatarFallback className="text-2xl">
                    {profile.full_name?.[0] || profile.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Avatar Upload Button */}
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-1 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  {avatarUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
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
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">
                    {profile.full_name || "Anonymous"}
                  </h2>
                  <Badge variant={getRoleBadgeVariant(profile.role)}>
                    {formatRole(profile.role)}
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-1">{profile.email}</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Member since {new Date(profile.created_at).toLocaleDateString()}
                </p>

                {/* Follower/Following Stats - Clickable */}
                <div className="flex items-center gap-4 mb-3">
                  <button
                    onClick={handleOpenFollowers}
                    className="text-sm hover:underline cursor-pointer"
                  >
                    <span className="font-bold">{followersCount}</span>{" "}
                    <span className="text-muted-foreground">
                      {followersCount === 1 ? "Follower" : "Followers"}
                    </span>
                  </button>
                  <button
                    onClick={handleOpenFollowing}
                    className="text-sm hover:underline cursor-pointer"
                  >
                    <span className="font-bold">{followingCount}</span>{" "}
                    <span className="text-muted-foreground">Following</span>
                  </button>
                </div>

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
                      No bio yet. Click the settings icon to add one!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Posts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Your Posts</h3>
              <Badge variant="secondary">{posts.length} posts</Badge>
            </div>

            {posts.length === 0 ? (
              <Card className="p-12 text-center">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Posts Yet</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't created any posts yet
                </p>
                <Button onClick={() => navigate("/")}>
                  Create Your First Post
                </Button>
              </Card>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={profile.id}
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