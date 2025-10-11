import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, FileText, Activity } from "lucide-react";

const SuperAdmin = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    onlineUsers: 0,
    postsToday: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkSuperAdmin();
    fetchStats();
  }, []);

  const checkSuperAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      navigate("/");
    }
  };

  const fetchStats = async () => {
    const { count: userCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: postCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayPostCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    setStats({
      totalUsers: userCount || 0,
      totalPosts: postCount || 0,
      onlineUsers: 0, // Placeholder - would need realtime presence
      postsToday: todayPostCount || 0
    });
  };

  const statCards = [
    { icon: Users, label: "Total Users", value: stats.totalUsers, color: "text-blue-500" },
    { icon: FileText, label: "Total Posts", value: stats.totalPosts, color: "text-green-500" },
    { icon: Activity, label: "Posts Today", value: stats.postsToday, color: "text-purple-500" },
    { icon: Users, label: "Online Users", value: stats.onlineUsers, color: "text-orange-500" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Super Admin Dashboard
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-6 animate-scale-in">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-primary/10 ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard Features</h2>
          <div className="space-y-4">
            <Button onClick={() => navigate("/manage-users")} className="w-full">
              Manage All Users
            </Button>
            <Button onClick={() => navigate("/events")} variant="outline" className="w-full">
              View All Events
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              More analytics and features can be added here as needed
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default SuperAdmin;
