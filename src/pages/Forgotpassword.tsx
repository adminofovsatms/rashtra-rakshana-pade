import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, ArrowLeft, Loader2, Mail } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendResetLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    if (countdown > 0) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast({
        title: "Check Your Email",
        description: "We've sent you a password reset link"
      });

      setEmailSent(true);
      setCountdown(120); // Start 120 second countdown
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
          {!emailSent ? (
            // Email Input Form
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-primary/10">
                    <KeyRound className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold mb-2">Forgot Password?</h1>
                <p className="text-muted-foreground">
                  No worries! Enter your email and we'll send you a reset link
                </p>
              </div>

              <form onSubmit={handleSendResetLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>

              <div className="text-center pt-4 border-t">
                <Button
                  variant="link"
                  onClick={() => navigate("/auth")}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          ) : (
            // Email Sent Confirmation
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-green-500/10">
                  <Mail className="h-12 w-12 text-green-500" />
                </div>
              </div>

              <div>
                <h1 className="text-3xl font-bold mb-2">Check Your Email</h1>
                <p className="text-muted-foreground">
                  We've sent a password reset link to
                </p>
                <p className="font-semibold text-lg mt-2">{email}</p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg text-sm text-left space-y-2">
                <p className="font-semibold">What to do next:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Check your inbox (and spam folder)</li>
                  <li>Click the password reset link in the email</li>
                  <li>Create your new password</li>
                  <li>Log in with your new password</li>
                </ol>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email?
                </p>
                <Button
                  onClick={() => handleSendResetLink()}
                  disabled={countdown > 0 || loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : countdown > 0 ? (
                    `Resend in ${formatTime(countdown)}`
                  ) : (
                    'Resend Reset Link'
                  )}
                </Button>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="link"
                  onClick={() => navigate("/auth")}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;