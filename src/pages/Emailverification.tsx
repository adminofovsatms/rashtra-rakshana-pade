// import { useState, useEffect } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import { Button } from "@/components/ui/button";
// import { Card } from "@/components/ui/card";
// import { supabase } from "@/integrations/supabase/client";
// import { useToast } from "@/hooks/use-toast";
// import { Mail, ArrowLeft, Loader2 } from "lucide-react";

// const EmailVerification = () => {
//   const [email, setEmail] = useState("");
//   const [resendLoading, setResendLoading] = useState(false);
//   const [countdown, setCountdown] = useState(0);
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { toast } = useToast();

//   useEffect(() => {
//     // Get email from navigation state
//     const emailFromState = location.state?.email;
//     if (emailFromState) {
//       setEmail(emailFromState);
//     } else {
//       // If no email in state, redirect back to auth
//       navigate("/auth");
//     }
//   }, [location, navigate]);

//   useEffect(() => {
//     // Countdown timer
//     if (countdown > 0) {
//       const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
//       return () => clearTimeout(timer);
//     }
//   }, [countdown]);

//   // const handleResendVerification = async () => {
//   //   if (countdown > 0) return;

//   //   setResendLoading(true);

//   //   try {
//   //     const { error } = await supabase.auth.resend({
//   //       type: 'signup',
//   //       email: email,
//   //       options: {
//   //         emailRedirectTo: `${window.location.origin}/`
//   //       }
//   //     });

//   //     if (error) throw error;

//   //     toast({
//   //       title: "Email Sent",
//   //       description: "A new verification link has been sent to your email"
//   //     });

//   //     // Start 120 second countdown
//   //     setCountdown(120);
//   //   } catch (error: any) {
//   //     toast({
//   //       title: "Error",
//   //       description: error.message,
//   //       variant: "destructive"
//   //     });
//   //   } finally {
//   //     setResendLoading(false);
//   //   }
//   // };

//   const formatTime = (seconds: number) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
//       <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
//         <div className="container mx-auto px-4 py-4 flex items-center justify-between">
//           <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
//             Hindu Unity
//           </h1>
//           <Button variant="ghost" size="icon" onClick={() => navigate("/auth")}>
//             <ArrowLeft className="h-5 w-5" />
//           </Button>
//         </div>
//       </header>

//       <div className="flex items-center justify-center p-4 min-h-[calc(100vh-73px)]">
//         <Card className="w-full max-w-md p-8 animate-scale-in">
//           <div className="text-center space-y-6">
//             {/* Icon */}
//             <div className="flex justify-center">
//               <div className="p-4 rounded-full bg-primary/10">
//                 <Mail className="h-12 w-12 text-primary" />
//               </div>
//             </div>

//             {/* Heading */}
//             <div>
//               <h1 className="text-3xl font-bold mb-2">Check Your Email</h1>
//               <p className="text-muted-foreground">
//                 We've sent a verification link to
//               </p>
//               <p className="font-semibold text-lg mt-2">{email}</p>
//             </div>

//             {/* Instructions */}
//             <div className="bg-muted/50 p-4 rounded-lg text-sm text-left space-y-2">
//               <p className="font-semibold">What to do next:</p>
//               <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
//                 <li>Check your inbox (and spam folder)</li>
//                 <li>Click the verification link in the email</li>
//                 <li>Return here and log in</li>
//               </ol>
//             </div>

//             {/* Resend Button */}
//             <div className="space-y-3">
//               <p className="text-sm text-muted-foreground">
//                 Didn't receive the email?
//               </p>
//               <Button
//                 onClick={handleResendVerification}
//                 disabled={countdown > 0 || resendLoading}
//                 variant="outline"
//                 className="w-full"
//               >
//                 {resendLoading ? (
//                   <>
//                     <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                     Sending...
//                   </>
//                 ) : countdown > 0 ? (
//                   `Resend in ${formatTime(countdown)}`
//                 ) : (
//                   'Resend Verification Email'
//                 )}
//               </Button>
//             </div>

//             {/* Back to Login */}
//             <div className="pt-4 border-t">
//               <Button
//                 variant="link"
//                 onClick={() => navigate("/auth")}
//                 className="w-full"
//               >
//                 Back to Login
//               </Button>
//             </div>
//           </div>
//         </Card>
//       </div>
//     </div>
//   );
// };

// export default EmailVerification;