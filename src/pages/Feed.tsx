import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CreatePost from "@/components/CreatePost";
import PostFeed from "@/components/PostFeed";
import { useUserRole } from "@/hooks/useUserRole";

const Feed = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin, isExecutive, isVolunteer, isMember, loading: roleLoading } = useUserRole(session?.user.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);


  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role, is_approved, is_suspended")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (data.is_suspended) {
        toast({
          title: "Account Suspended",
          description: "Your account has been suspended by an administrator",
          variant: "destructive"
        });
        await supabase.auth.signOut();
        return;
      }

      if (!data.is_approved) {
        toast({
          title: "Pending Approval",
          description: "Your account is awaiting admin approval",
          variant: "default"
        });
      }
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Hindu Unity
          </h1>
          <div className="flex items-center gap-4">
            {(isVolunteer || isExecutive || isSuperAdmin || isMember) && (
              <Button onClick={() => navigate("/events")} variant="outline">
                Events
              </Button>
            )}
            {isExecutive && (
              <Button onClick={() => navigate("/manage-users")} variant="outline">
                Dashboard
              </Button>
            )}
            {isSuperAdmin && (
              <>
                <Button onClick={() => navigate("/manage-users")} variant="outline">
                  Manage Users
                </Button>
                <Button onClick={() => navigate("/admin")} variant="outline">
                  Super Admin
                </Button>
              </>
            )}
            {session ? (
              <>
                <Button onClick={() => navigate("/profile")} variant="outline">
                  Profile
                </Button>
                <Button onClick={handleLogout} variant="ghost" size="icon">
                  
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/auth")} variant="default">
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {session ? (
            <CreatePost userId={session.user.id} userRole={isVolunteer || isExecutive || isSuperAdmin ? "volunteer" : "member"} />
          ) : (
            <div className="bg-card p-6 rounded-lg border text-center">
              <p className="text-muted-foreground mb-4">Sign in to create posts and interact with Hindu Unity</p>
              <Button onClick={() => navigate("/auth")}>Sign In</Button>
            </div>
          )}
          <PostFeed userId={session?.user.id} />
        </div>
      </main>
    </div>
  );
};

export default Feed;