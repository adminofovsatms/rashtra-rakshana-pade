import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, MapPin, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import GoogleMapsLink from "@/components/GoogleMapsLink";

interface ProtestCardProps {
  protest: {
    id: string;
    user_id: string;
    reason: string;
    location: string;
    location_lat?: number;
    location_lng?: number;
    created_at: string;
  };
  currentUserId: string | undefined;
}

interface ResponseCounts {
  will_come: number;
  cant_come: number;
  not_needed: number;
}

export const ProtestCard = ({ protest, currentUserId }: ProtestCardProps) => {
  const { toast } = useToast();
  const [organizerProfile, setOrganizerProfile] = useState<any>(null);
  const [userResponse, setUserResponse] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [responseCounts, setResponseCounts] = useState<ResponseCounts>({
    will_come: 0,
    cant_come: 0,
    not_needed: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOrganizerProfile();
    fetchUserResponse();
    fetchUserRole();
    fetchResponseCounts();
  }, [protest.id, currentUserId]);

  const fetchOrganizerProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", protest.user_id)
      .single();

    setOrganizerProfile(data);
  };

  const fetchUserResponse = async () => {
    if (!currentUserId) return;

    const { data } = await supabase
      .from("protest_responses")
      .select("response_type")
      .eq("protest_id", protest.id)
      .eq("user_id", currentUserId)
      .maybeSingle();

    setUserResponse(data?.response_type || null);
  };

  const fetchUserRole = async () => {
    if (!currentUserId) return;

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUserId)
      .single();

    setUserRole(data?.role || null);
  };

  const fetchResponseCounts = async () => {
    const { data } = await supabase
      .from("protest_responses")
      .select("response_type")
      .eq("protest_id", protest.id);

    if (data) {
      const counts: ResponseCounts = {
        will_come: data.filter((r) => r.response_type === "will_come").length,
        cant_come: data.filter((r) => r.response_type === "cant_come").length,
        not_needed: data.filter((r) => r.response_type === "not_needed").length,
      };
      setResponseCounts(counts);
    }
  };

  const handleResponse = async (responseType: string) => {
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to respond to this protest",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (userResponse === responseType) {
        // Delete the response if clicking the same button
        await supabase
          .from("protest_responses")
          .delete()
          .eq("protest_id", protest.id)
          .eq("user_id", currentUserId);
        
        setUserResponse(null);
      } else {
        // Upsert the response
        await supabase
          .from("protest_responses")
          .upsert({
            protest_id: protest.id,
            user_id: currentUserId,
            response_type: responseType as "will_come" | "cant_come" | "not_needed",
          });
        
        setUserResponse(responseType);
      }

      await fetchResponseCounts();
      
      toast({
        title: "Response Recorded",
        description: "Your response has been saved",
      });
    } catch (error) {
      console.error("Error responding to protest:", error);
      toast({
        title: "Error",
        description: "Failed to record your response",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOrganizer = currentUserId === protest.user_id;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-3 bg-primary/10 rounded-full">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={organizerProfile?.avatar_url} />
              <AvatarFallback>
                {organizerProfile?.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">
                {organizerProfile?.full_name || "Unknown User"}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(protest.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold mb-1">Reason for Protest</h3>
              <p className="text-sm">{protest.reason}</p>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <GoogleMapsLink
                address={protest.location}
                lat={protest.location_lat || undefined}
                lng={protest.location_lng || undefined}
                className="text-muted-foreground hover:text-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Response Buttons */}
      {userRole === "member" && userResponse ? (
        <div className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-700 font-medium">You opted to visit the protest</span>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={userResponse === "will_come" ? "default" : "outline"}
            onClick={() => handleResponse("will_come")}
            disabled={isSubmitting || (userRole === "member" && userResponse !== null)}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            I will come{userRole !== "member" && ` (${responseCounts.will_come})`}
          </Button>
          <Button
            size="sm"
            variant={userResponse === "cant_come" ? "default" : "outline"}
            onClick={() => handleResponse("cant_come")}
            disabled={isSubmitting || (userRole === "member" && userResponse !== null)}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-1" />
            I can't come{userRole !== "member" && ` (${responseCounts.cant_come})`}
          </Button>
          <Button
            size="sm"
            variant={userResponse === "not_needed" ? "default" : "outline"}
            onClick={() => handleResponse("not_needed")}
            disabled={isSubmitting || (userRole === "member" && userResponse !== null)}
            className="flex-1"
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Not needed{userRole !== "member" && ` (${responseCounts.not_needed})`}
          </Button>
        </div>
      )}

      {/* Results for Protest Organizer (Volunteer who posted) */}
      {isOrganizer && userRole && (userRole === "volunteer" || userRole === "executive" || userRole === "super_admin") && (
        <div className="pt-4 border-t">
          <p className="text-sm font-semibold mb-2">Total Responses: {responseCounts.will_come + responseCounts.cant_come + responseCounts.not_needed}</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-green-500/10 p-2 rounded text-center">
              <p className="font-semibold text-green-600">Will Come</p>
              <p className="text-lg">{responseCounts.will_come}</p>
            </div>
            <div className="bg-red-500/10 p-2 rounded text-center">
              <p className="font-semibold text-red-600">Can't Come</p>
              <p className="text-lg">{responseCounts.cant_come}</p>
            </div>
            <div className="bg-yellow-500/10 p-2 rounded text-center">
              <p className="font-semibold text-yellow-600">Not Needed</p>
              <p className="text-lg">{responseCounts.not_needed}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
