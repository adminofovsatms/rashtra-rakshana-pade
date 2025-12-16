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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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

    setCurrentUserId(user.id);

    // Check if user has super_admin or executive role from user_roles table
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = roles?.map(r => r.role) || [];
    const isSuperAdmin = userRoles.includes("super_admin");
    const isExecutive = userRoles.includes("executive");

    // Allow access to both super_admin and executive
    if (!isSuperAdmin && !isExecutive) {
      navigate("/");
      return;
    }

    setCurrentUserRole(isSuperAdmin ? "super_admin" : "executive");
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setUsers(data || []);
    setFilteredUsers(data || []);
  };

  // Check if current user can perform actions on target user
  const canManageUser = (targetUserRole: string, targetUserId: string): boolean => {
    // Can't manage yourself
    if (targetUserId === currentUserId) {
      return false;
    }

    // Super admin can manage anyone
    if (currentUserRole === "super_admin") {
      return true;
    }

    // Executive can manage members and volunteers, but not other executives or super_admins
    if (currentUserRole === "executive") {
      return targetUserRole === "member" || targetUserRole === "volunteer";
    }

    return false;
  };

  const handleSuspend = async (userId: string, currentStatus: boolean, targetUserRole: string) => {
    if (!canManageUser(targetUserRole, userId)) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to manage this user",
        variant: "destructive",
      });
      return;
    }

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

  const handleDelete = async (userId: string, targetUserRole: string) => {
    if (!canManageUser(targetUserRole, userId)) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete this user",
        variant: "destructive",
      });
      return;
    }

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
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Manage Users</h1>
          </div>
          <Badge variant="outline" className="text-sm">
            {currentUserRole === "super_admin" ? "Super Admin" : "Executive"} Access
          </Badge>
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

        {/* Permission Info Banner for Executives */}
        {currentUserRole === "executive" && (
          <Card className="p-4 mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Executive Access:</strong> You can manage Members and Volunteers only. 
              Other Executives and Super Admins cannot be modified.
            </p>
          </Card>
        )}

        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const canManage = canManageUser(user.role, user.id);
            const isSelf = user.id === currentUserId;

            return (
              <Card key={user.id} className="p-6 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">
                        {user.full_name || "Anonymous"}
                        {isSelf && <span className="text-sm text-muted-foreground ml-2">(You)</span>}
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
                    {/* Approve button - only for executives needing approval */}
                    {user.role === "executive" && !user.is_approved && currentUserRole === "super_admin" && (
                      <Button
                        onClick={() => handleApprove(user.id)}
                        size="sm"
                        variant="outline"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    )}
                    
                    {/* Suspend button - only if user can be managed */}
                    {canManage && (
                      <Button
                        onClick={() => handleSuspend(user.id, user.is_suspended, user.role)}
                        size="sm"
                        variant={user.is_suspended ? "outline" : "destructive"}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        {user.is_suspended ? "Unsuspend" : "Suspend"}
                      </Button>
                    )}

                    {/* Delete button - only if user can be managed */}
                    {canManage && (
                      <Button
                        onClick={() => handleDelete(user.id, user.role)}
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
            );
          })}

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