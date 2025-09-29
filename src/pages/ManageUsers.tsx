import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, Ban, CheckCircle, Trash2 } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_approved: boolean;
  is_suspended: boolean;
  created_at: string;
}

const ManageUsers = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkPermissions();
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const checkPermissions = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profile?.role !== "executive" &&
      profile?.role !== "super_admin"
    ) {
      navigate("/feed");
      return;
    }

    setCurrentUserRole(profile.role);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setUsers(data || []);
    setFilteredUsers(data || []);
  };

  const handleSuspend = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: !currentStatus })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: currentStatus ? "User unsuspended" : "User suspended",
        description: currentStatus
          ? "User can now access the platform"
          : "User has been suspended from the platform",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_approved: true })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "User approved",
        description: "Executive account has been approved",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      toast({
        title: "User deleted",
        description: "User account has been permanently deleted",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/feed")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Manage Users</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </Card>

        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="p-6 animate-fade-in">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">
                      {user.full_name || "Anonymous"}
                    </h3>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role.replace("_", " ")}
                    </Badge>
                    {user.is_suspended && (
                      <Badge variant="destructive">Suspended</Badge>
                    )}
                    {user.role === "executive" && !user.is_approved && (
                      <Badge variant="outline">Pending Approval</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  {user.role === "executive" && !user.is_approved && (
                    <Button
                      onClick={() => handleApprove(user.id)}
                      size="sm"
                      variant="outline"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => handleSuspend(user.id, user.is_suspended)}
                    size="sm"
                    variant={user.is_suspended ? "outline" : "destructive"}
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    {user.is_suspended ? "Unsuspend" : "Suspend"}
                  </Button>

                  {currentUserRole === "super_admin" && (
                    <Button
                      onClick={() => handleDelete(user.id)}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No users found matching your search</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManageUsers;
