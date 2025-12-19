import { Calendar, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

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
    avatar_url: string | null;
  };
}

interface EventCardProps {
  event: Event;
  currentUserId?: string;
  onEventDeleted?: () => void;
}

export const EventCard = ({ event, currentUserId, onEventDeleted }: EventCardProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isCreator = currentUserId === event.created_by;

  const handleAvatarClick = () => {
    if (!currentUserId) {
      // Not logged in, redirect to auth
      window.location.href = "/auth";
      return;
    }

    // If it's the current user's event, go to their profile
    if (currentUserId === event.created_by) {
      navigate("/profile");
    } else {
      // Otherwise, go to the creator's profile
      navigate(`/user/${event.created_by}`);
    }
  };
  
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id);

      if (error) throw error;

      toast({
        title: "Event deleted",
        description: "The event has been successfully deleted",
        duration: 1000
      });

      if (onEventDeleted) {
        onEventDeleted();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 1000
      });
    }
  };

  return (
    <div className="bg-card px-4 py-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Clickable Avatar */}
          <div onClick={handleAvatarClick} className="cursor-pointer">
            <Avatar className="w-10 h-10 hover:opacity-80 transition-opacity">
              {event.profiles.avatar_url ? (
                <AvatarImage 
                  src={event.profiles.avatar_url} 
                  alt={event.profiles.full_name || "User Avatar"} 
                />
              ) : null}
              <AvatarFallback>
                {event.profiles.full_name
                  ? event.profiles.full_name.charAt(0).toUpperCase()
                  : "U"}
              </AvatarFallback>
            </Avatar>
          </div>

          <div>
            {/* Clickable Username */}
            <p 
              className="font-semibold text-sm cursor-pointer hover:underline"
              onClick={handleAvatarClick}
            >
              {event.profiles.full_name || "Anonymous"}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {event.event_type}
          </span>
          {isCreator && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Event Content */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">{event.title}</h3>
        
        {event.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {event.description}
          </p>
        )}

        {/* Event Details */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {new Date(event.event_date).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            <span className="text-muted-foreground">
              at {new Date(event.event_date).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {/* <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            View Details
          </Button>
          <Button variant="default" size="sm" className="flex-1">
            RSVP
          </Button>
        </div> */}
      </div>
    </div>
  );
};