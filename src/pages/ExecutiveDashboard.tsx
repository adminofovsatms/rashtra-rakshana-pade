import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Users, 
  UserCheck, 
  FileText, 
  Image, 
  Video, 
  BarChart3,
  TrendingUp 
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  liveUsers: number;
  todayPosts: {
    text: number;
    image: number;
    video: number;
    poll: number;
    total: number;
  };
}

const ExecutiveDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    liveUsers: 0,
    todayPosts: {
      text: 0,
      image: 0,
      video: 0,
      poll: 0,
      total: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (userRole === "executive" || userRole === "super_admin") {
      fetchDashboardStats();
      
      // Set up real-time updates
      const interval = setInterval(fetchDashboardStats, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [userRole]);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_approved")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "executive" && profile.role !== "super_admin")) {
      toast({
        title: "Access Denied",
        description: "Only executives and admins can view this dashboard",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    if (profile.role === "executive" && !profile.is_approved) {
      toast({
        title: "Pending Approval",
        description: "Your executive account requires approval to access this dashboard",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setUserRole(profile.role);
  };

  const fetchDashboardStats = async () => {
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch users active in last 5 minutes (considered "live")
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count: liveUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", fiveMinutesAgo);

      // Fetch today's posts grouped by type
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: posts } = await supabase
        .from("posts")
        .select("post_type")
        .gte("created_at", today.toISOString());

      // Count posts by type
      const postsByType = {
        text: 0,
        image: 0,
        video: 0,
        poll: 0,
        total: 0
      };

      if (posts) {
        postsByType.total = posts.length;
        posts.forEach(post => {
          if (post.post_type in postsByType) {
            postsByType[post.post_type as keyof typeof postsByType]++;
          }
        });
      }

      setStats({
        totalUsers: totalUsers || 0,
        liveUsers: liveUsers || 0,
        todayPosts: postsByType
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!userRole) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Executive Dashboard
          </h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* User Statistics */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Statistics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Users</p>
                      <p className="text-4xl font-bold">{stats.totalUsers}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        All registered members
                      </p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Active Now</p>
                      <p className="text-4xl font-bold text-green-600">{stats.liveUsers}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Active in last 5 minutes
                      </p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-full">
                      <UserCheck className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Post Statistics */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Today's Posts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-primary/10 rounded-full mb-3">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Total Posts</p>
                    <p className="text-3xl font-bold">{stats.todayPosts.total}</p>
                  </div>
                </Card>

                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-blue-500/10 rounded-full mb-3">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Text Posts</p>
                    <p className="text-3xl font-bold">{stats.todayPosts.text}</p>
                  </div>
                </Card>

                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-purple-500/10 rounded-full mb-3">
                      <Image className="h-6 w-6 text-purple-600" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Image Posts</p>
                    <p className="text-3xl font-bold">{stats.todayPosts.image}</p>
                  </div>
                </Card>

                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-red-500/10 rounded-full mb-3">
                      <Video className="h-6 w-6 text-red-600" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Video Posts</p>
                    <p className="text-3xl font-bold">{stats.todayPosts.video}</p>
                  </div>
                </Card>

                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-orange-500/10 rounded-full mb-3">
                      <BarChart3 className="h-6 w-6 text-orange-600" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Poll Posts</p>
                    <p className="text-3xl font-bold">{stats.todayPosts.poll}</p>
                  </div>
                </Card>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 justify-start"
                  onClick={() => navigate("/manage-users")}
                >
                  <Users className="h-5 w-5 mr-2" />
                  <div className="text-left">
                    <p className="font-semibold">Manage Users</p>
                    <p className="text-xs text-muted-foreground">
                      Approve, suspend, or manage user accounts
                    </p>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto py-4 justify-start"
                  onClick={() => navigate("/events")}
                >
                  <FileText className="h-5 w-5 mr-2" />
                  <div className="text-left">
                    <p className="font-semibold">Manage Events</p>
                    <p className="text-xs text-muted-foreground">
                      Create and organize community events
                    </p>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
