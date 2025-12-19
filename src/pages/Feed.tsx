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
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";


const Feed = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin, isExecutive, isVolunteer, isMember, loading: roleLoading } = useUserRole(session?.user.id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
          variant: "destructive",
          duration: 1000
        });
        await supabase.auth.signOut();
        return;
      }

      if (!data.is_approved) {
        toast({
          title: "Pending Approval",
          description: "Your account is awaiting admin approval",
          variant: "default",
          duration: 1000
        });
      }
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 1000
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
  <div className="container mx-auto px-2 py-2 flex items-center justify-between">
    <h1 
      className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
      onClick={() => navigate("/")}
    >
      Hindu Unity
    </h1>
    
    {/* Desktop Navigation - Hidden on mobile */}
    <div className="hidden md:flex items-center gap-2">
      {(isVolunteer || isExecutive || isSuperAdmin || isMember) && (
        <Button onClick={() => navigate("/events")} variant="outline" size="sm">
          Events
        </Button>
      )}
      {isExecutive && (
        <Button onClick={() => navigate("/manage-users")} variant="outline" size="sm">
          Dashboard
        </Button>
      )}
      {isSuperAdmin && (
        <>
          <Button onClick={() => navigate("/manage-users")} variant="outline" size="sm">
            Manage Users
          </Button>
          <Button onClick={() => navigate("/admin")} variant="outline" size="sm">
            Super Admin
          </Button>
        </>
      )}
      {session ? (
        <>
          <Button onClick={() => navigate("/profile")} variant="outline" size="sm">
            Profile
          </Button>
          <Button onClick={handleLogout} variant="ghost" size="icon" className="h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <Button onClick={() => navigate("/auth")} variant="default" size="sm">
          Login
        </Button>
      )}
    </div>

    {/* Mobile Hamburger Menu - Hidden on desktop */}
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-64">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2 mt-4">
          {(isVolunteer || isExecutive || isSuperAdmin || isMember) && (
            <Button 
              onClick={() => {
                navigate("/events");
                setMobileMenuOpen(false);
              }} 
              variant="outline" 
              className="w-full justify-start"
            >
              Events
            </Button>
          )}
          {isExecutive && (
            <Button 
              onClick={() => {
                navigate("/manage-users");
                setMobileMenuOpen(false);
              }} 
              variant="outline" 
              className="w-full justify-start"
            >
              Dashboard
            </Button>
          )}
          {isSuperAdmin && (
            <>
              <Button 
                onClick={() => {
                  navigate("/manage-users");
                  setMobileMenuOpen(false);
                }} 
                variant="outline" 
                className="w-full justify-start"
              >
                Manage Users
              </Button>
              <Button 
                onClick={() => {
                  navigate("/admin");
                  setMobileMenuOpen(false);
                }} 
                variant="outline" 
                className="w-full justify-start"
              >
                Super Admin
              </Button>
            </>
          )}
          {session ? (
            <>
              <Button 
                onClick={() => {
                  navigate("/profile");
                  setMobileMenuOpen(false);
                }} 
                variant="outline" 
                className="w-full justify-start"
              >
                Profile
              </Button>
              <Button 
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }} 
                variant="outline" 
                className="w-full justify-start text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => {
                navigate("/auth");
                setMobileMenuOpen(false);
              }} 
              variant="default" 
              className="w-full"
            >
              Login
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  </div>
</header>

      <main className="container mx-auto px-2 py-2 max-w-2xl">
        <div className="space-y-2">
          {session ? (
            <CreatePost userId={session.user.id} userRole={isVolunteer || isExecutive || isSuperAdmin ? "volunteer" : "member"} />
          ) : (
            <div className="bg-card p-3 rounded-lg border text-center">
              <p className="text-muted-foreground text-sm mb-2">Sign in to create posts and interact</p>
              <Button onClick={() => navigate("/auth")} size="sm">Sign In</Button>
            </div>
          )}
          <PostFeed userId={session?.user.id} />
        </div>
      </main>
    </div>
  );
};

export default Feed;