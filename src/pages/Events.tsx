import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, MapPin, Users, Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  location: string | null;
  event_date: string;
  created_at: string;
  created_by: string;
  profiles: {
    full_name: string | null;
  };
}

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_type: "event",
    location: "",
    event_date: ""
  });

  useEffect(() => {
    checkPermissions();
    fetchEvents();
  }, []);

  const checkPermissions = async () => {
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

    setUserId(user.id);
    setUserRole(profile?.role || null);
  };

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .order("event_date", { ascending: true });

    setEvents(data || []);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.event_date) {
      toast({
        title: "Missing information",
        description: "Please provide at least a title and date",
        variant: "destructive",
        
      });
      return;
    }

    setLoading(true);
    try {
      // Create the event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .insert({
          created_by: userId,
          title: newEvent.title,
          description: newEvent.description || null,
          event_type: newEvent.event_type,
          location: newEvent.location || null,
          event_date: new Date(newEvent.event_date).toISOString()
        })
        .select()
        .single();

      if (eventError) throw eventError;

      toast({
        title: "Event created!",
        description: "Your event has been created successfully"
      });

      setIsCreateOpen(false);
      setNewEvent({
        title: "",
        description: "",
        event_type: "event",
        location: "",
        event_date: ""
      });
      fetchEvents();
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

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      toast({
        title: "Event deleted",
        description: "The event has been successfully deleted"
      });

      // Remove event from local state
      setEvents(events.filter(event => event.id !== eventId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const canCreateEvents = userRole === "volunteer" || userRole === "executive" || userRole === "super_admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Events & Protests</h1>
          </div>
          {canCreateEvents && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={newEvent.event_type}
                      onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="protest">Protest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date & Time</Label>
                    <Input
                      id="date"
                      type="datetime-local"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    />
                  </div>

                  <Button onClick={handleCreateEvent} disabled={loading} className="w-full">
                    {loading ? "Creating..." : "Create Event"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No events scheduled yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <Card key={event.id} className="p-6 animate-fade-in hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Organized by {event.profiles.full_name || "Anonymous"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                      {event.event_type}
                    </span>
                    {/* Delete button - only visible to event creator */}
                    {userId === event.created_by && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {event.description && (
                  <p className="text-muted-foreground mb-4">{event.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(event.event_date).toLocaleDateString()} at{" "}
                      {new Date(event.event_date).toLocaleTimeString()}
                    </span>
                  </div>

                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    RSVP (Feature placeholder)
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Events;