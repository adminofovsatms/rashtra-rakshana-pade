import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserCircle, Users, Shield, Crown } from "lucide-react";

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
  const [isLogin, setIsLogin] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "Successfully logged in"
        });

        navigate("/feed");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: selectedRole
            },
            emailRedirectTo: `${window.location.origin}/feed`
          }
        });

        if (error) throw error;

        toast({
          title: selectedRole === "executive" ? "Approval Required" : "Account Created!",
          description: selectedRole === "executive" 
            ? "Your executive account requires admin approval before you can access all features"
            : "Successfully created your account. You can now log in."
        });

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
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center p-4">
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center p-4">
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

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
              if (!isLogin) setSelectedRole(null);
            }}
          >
            {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
