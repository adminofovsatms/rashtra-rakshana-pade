import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Megaphone } from "lucide-react";
import LocationPicker from "@/components/LocationPicker";

const OrganiseProtest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [locationData, setLocationData] = useState<{
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
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

      if (!profile || (profile.role !== "volunteer" && profile.role !== "executive" && profile.role !== "super_admin")) {
        toast({
          title: "Access Denied",
          description: "Only volunteers and above can organize protests",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setUserRole(profile.role);
    };

    checkUserRole();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim() || !location.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both reason and location",
        variant: "destructive",
      });
      return;
    }

    if (!locationData) {
      toast({
        title: "Location Required",
        description: "Please select a location from the suggestions",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { error } = await supabase
        .from("protests")
        .insert({
          user_id: user.id,
          reason: reason.trim(),
          location: location.trim(),
          location_lat: locationData.lat,
          location_lng: locationData.lng,
        });

      if (error) throw error;

      toast({
        title: "Protest Organized",
        description: "Your protest has been created successfully",
      });

      setReason("");
      setLocation("");
      setLocationData(null);
      navigate("/");
    } catch (error) {
      console.error("Error creating protest:", error);
      toast({
        title: "Error",
        description: "Failed to create protest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationSelect = (location: { address: string; lat: number; lng: number }) => {
    setLocationData(location);
    setLocation(location.address);
  };

  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
    // Clear location data if user manually types something different
    if (locationData && locationData.address !== newLocation) {
      setLocationData(null);
    }
  };

  if (!userRole) {
    return null;
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

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-full">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Organise Protest</h2>
              <p className="text-muted-foreground">Create a protest and gather support</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium">
                Reason for Protest
              </label>
              <Textarea
                id="reason"
                placeholder="Describe why this protest is needed..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="location" className="text-sm font-medium">
                Protest Location
              </label>
              <LocationPicker
                onLocationSelect={handleLocationSelect}
                onChange={handleLocationChange}
                placeholder="Enter the location for the protest"
                value={location}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Protest"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default OrganiseProtest;
