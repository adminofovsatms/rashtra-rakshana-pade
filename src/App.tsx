import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Events from "./pages/Events";
import ManageUsers from "./pages/ManageUsers";
import SuperAdmin from "./pages/SuperAdmin";
import LiveStream from "./pages/LiveStream";
import OrganiseProtest from "./pages/OrganiseProtest";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import ApproveExecutive from "./pages/ApproveExecutive";
import NotFound from "./pages/NotFound";
import PendingPosts from "./pages/PendingPosts";
import ForgotPassword from "./pages/Forgotpassword";
import ResetPassword from "./pages/Resetpassword";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/home" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/events" element={<Events />} />
          <Route path="/manage-users" element={<ManageUsers />} />
          <Route path="/admin" element={<SuperAdmin />} />
          <Route path="/live-stream" element={<LiveStream />} />
          <Route path="/organise-protest" element={<OrganiseProtest />} />
          <Route path="/executive-dashboard" element={<ExecutiveDashboard />} />
          <Route path="/approve-exec" element={<ApproveExecutive />} />
          <Route path="/pending-posts" element={<PendingPosts />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/user/:userId" element={<UserProfile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
