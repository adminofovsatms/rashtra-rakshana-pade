import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserCircle, Users, Shield, ArrowLeft } from "lucide-react";

type UserRole = "member" | "volunteer" | "executive" | "super_admin";

const roleCards = [
  {
    value: "member" as UserRole,
    icon: UserCircle,
    title: "Member",
    description: "View posts, react, comment, and share content with Hindu Unity"
  },
  {
    value: "volunteer" as UserRole,
    icon: Users,
    title: "Volunteer",
    description: "All member privileges + organize events and protests"
  },
  {
    value: "executive" as UserRole,
    icon: Shield,
    title: "Executive",
    description: "All volunteer privileges + manage and suspend user accounts (requires approval)"
  }
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

 const handleAuth = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!isLogin && !selectedRole) {
    toast({
      title: "Please select a role",
      description: "Choose your role to continue with signup",
      variant: "destructive"
    });
    return;
  }

  if (!isLogin && password !== confirmPassword) {
    toast({
      title: "Passwords don't match",
      description: "Please make sure both passwords are identical",
      variant: "destructive"
    });
    return;
  }

  setLoading(true);

  try {
    if (isLogin) {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginError) throw loginError;

      // Fetch the user's profile from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_approved")
        .eq("id", loginData.user?.id)
        .single();
      console.log(profile);
      if (profileError) throw profileError;

      // Block executive users who are not approved
      if (profile.role === "executive" && !profile.is_approved) {
        // Log out the user
        await supabase.auth.signOut();

        toast({
          title: "Access Denied",
          description: "Your account is not approved yet.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Successfully logged in"
      });

      navigate("/");
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: selectedRole
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (signUpError) throw signUpError;

      setIsLogin(true);
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


  if (!isLogin && !selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Hindu Unity
            </h1>
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </header>
        
        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-73px)]">
          <div className="w-full max-w-5xl animate-fade-in">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Join Hindu Unity
            </h1>
            <p className="text-muted-foreground text-lg">Select your role to get started</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {roleCards.map((role) => {
              const Icon = role.icon;
              return (
                <Card
                  key={role.value}
                  className="p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2"
                  onClick={() => setSelectedRole(role.value)}
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-4 rounded-full bg-primary/10">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl mb-2">{role.title}</h3>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="text-center">
            <Button variant="link" onClick={() => setIsLogin(true)}>
              Already have an account? Log in
            </Button>
          </div>
        </div>
        </div>
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-73px)]">
      <Card className="w-full max-w-md p-8 animate-scale-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin ? "Sign in to continue" : `Join as ${selectedRole}`}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {isLogin && (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot password?
                </Button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isLogin ? "Log In" : "Sign Up"}
          </Button>

          {!isLogin && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setSelectedRole(null)}
            >
              Change Role
            </Button>
          )}

          <Button
            type="button"
            variant="link"
            className="w-full"
            onClick={() => {
              setIsLogin(!isLogin);
              setConfirmPassword("");
              if (!isLogin) setSelectedRole(null);
            }}
          >
            {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
          </Button>
        </form>
      </Card>
      </div>
    </div>
  
  );
};

export default Auth;