import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, X } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_approved: boolean;
  created_at: string;
}

const ApproveExecutive = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pendingExecutives, setPendingExecutives] = useState<Profile[]>([]);

  useEffect(() => {
    checkSuperAdmin();
    fetchPendingExecutives();
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

    if (!profile || profile.role !== "super_admin") {
      toast({
        title: "Access Denied",
        description: "Only super admins can access this page",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const fetchPendingExecutives = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "executive")
      .eq("is_approved", false)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch pending executives",
        variant: "destructive",
      });
      return;
    }

    setPendingExecutives(data || []);
  };

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to approve executive",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Executive approved successfully",
    });

    fetchPendingExecutives();
  };

  const handleReject = async (userId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to reject this executive? This will delete their account."
    );

    if (!confirmed) return;

    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject executive",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Executive rejected and account deleted",
    });

    fetchPendingExecutives();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Approve Executive Users</h1>
        </div>

        {pendingExecutives.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No pending executive approvals
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingExecutives.map((executive) => (
              <Card key={executive.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {executive.full_name || "No name provided"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {executive.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requested on: {new Date(executive.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">Pending Approval</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(executive.id)}
                      className="flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(executive.id)}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApproveExecutive;