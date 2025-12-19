import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const verifyResetSession = async () => {
      try {
        // When user clicks the reset link, Supabase automatically exchanges the token
        // and creates a session. We just need to verify it exists.
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.error('Session error:', error);
          toast({
            title: "Invalid or Expired Link",
            description: "This password reset link is invalid or has expired. Please request a new one.",
            variant: "destructive"
          });
          setTimeout(() => navigate("/forgot-password"), 3000);
          setCheckingSession(false);
          return;
        }

        // Verify this is a recovery session (password reset)
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: "Authentication Failed",
            description: "Unable to verify your identity. Please request a new reset link.",
            variant: "destructive"
          });
          setTimeout(() => navigate("/forgot-password"), 3000);
          setCheckingSession(false);
          return;
        }

        console.log('Valid reset session for user:', user.email);
        setSessionValid(true);
        setCheckingSession(false);
      } catch (error: any) {
        console.error('Verification error:', error);
        toast({
          title: "Error",
          description: "Failed to verify reset link. Please try again.",
          variant: "destructive"
        });
        setTimeout(() => navigate("/forgot-password"), 3000);
        setCheckingSession(false);
      }
    };

    verifyResetSession();
  }, [navigate, toast]);

  const validatePassword = (pwd: string): { isValid: boolean; message?: string } => {
    if (pwd.length < 6) {
      return { isValid: false, message: "Password must be at least 6 characters long" };
    }
    if (pwd.length > 72) {
      return { isValid: false, message: "Password must be less than 72 characters" };
    }
    // Add more validation rules as needed
    return { isValid: true };
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical",
        variant: "destructive"
      });
      return;
    }

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.isValid) {
      toast({
        title: "Invalid Password",
        description: validation.message,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Update the user's password
      // Supabase automatically uses the current session to update the password
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      console.log('Password updated successfully for user:', data.user?.email);

      toast({
        title: "Password Reset Successful! ✓",
        description: "Your password has been updated. Redirecting to login...",
      });

      // Sign out the user to ensure they log in with the new password
      await supabase.auth.signOut();

      // Redirect to login after 2 seconds
      setTimeout(() => navigate("/auth"), 2000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = error.message;
      
      // Handle specific error cases
      if (error.message?.includes('session')) {
        errorMessage = "Your session has expired. Please request a new password reset link.";
      } else if (error.message?.includes('password')) {
        errorMessage = "Unable to update password. Please ensure it meets all requirements.";
      }

      toast({
        title: "Error Resetting Password",
        description: errorMessage,
        variant: "destructive"
      });

      // If session expired, redirect to forgot password
      if (error.message?.includes('session')) {
        setTimeout(() => navigate("/forgot-password"), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (pwd: string): { strength: string; color: string } => {
    if (!pwd) return { strength: "", color: "" };
    
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 10) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 1) return { strength: "Weak", color: "text-red-500" };
    if (strength <= 3) return { strength: "Medium", color: "text-yellow-500" };
    return { strength: "Strong", color: "text-green-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!sessionValid) {
    return null; // Will redirect automatically
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Hindu Unity
          </h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/auth")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-73px)]">
        <Card className="w-full max-w-md p-8 animate-scale-in">
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <KeyRound className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h1 className="text-3xl font-bold mb-2">Set New Password</h1>
              <p className="text-muted-foreground">
                Choose a strong password to secure your account
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* New Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    At least 6 characters
                  </span>
                  {password && (
                    <span className={`font-medium ${passwordStrength.color}`}>
                      {passwordStrength.strength}
                    </span>
                  )}
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <span className="text-xs">✗</span>
                    Passwords do not match
                  </p>
                )}
                {confirmPassword && password === confirmPassword && password.length >= 6 && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-sm mb-2">Password must contain:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li className={password.length >= 6 ? "text-green-600" : ""}>
                    {password.length >= 6 ? "✓" : "○"} At least 6 characters
                  </li>
                  <li className={password.length >= 10 ? "text-green-600" : ""}>
                    {password.length >= 10 ? "✓" : "○"} 10+ characters (recommended)
                  </li>
                  <li className={/[a-zA-Z]/.test(password) && /\d/.test(password) ? "text-green-600" : ""}>
                    {/[a-zA-Z]/.test(password) && /\d/.test(password) ? "✓" : "○"} Letters and numbers
                  </li>
                </ul>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || password !== confirmPassword || password.length < 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Remember your password?
              </p>
              <Button
                variant="link"
                onClick={() => navigate("/auth")}
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;