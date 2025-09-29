import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Megaphone, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-16 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Community Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Connect, organize, and make a difference together. Join our vibrant community of members, volunteers, and leaders.
          </p>
          <Button onClick={() => navigate("/auth")} size="lg" className="text-lg px-8">
            Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card p-8 rounded-lg shadow-lg animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="p-3 rounded-full bg-primary/10 w-fit mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Social Feed</h3>
            <p className="text-muted-foreground">
              Share posts, images, videos, and polls. Engage with the community through likes, comments, and shares.
            </p>
          </div>

          <div className="bg-card p-8 rounded-lg shadow-lg animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="p-3 rounded-full bg-accent/10 w-fit mb-4">
              <Megaphone className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Organize Events</h3>
            <p className="text-muted-foreground">
              Volunteers can create and manage events and protests. Rally the community around important causes.
            </p>
          </div>

          <div className="bg-card p-8 rounded-lg shadow-lg animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="p-3 rounded-full bg-success/10 w-fit mb-4">
              <Shield className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Community Management</h3>
            <p className="text-muted-foreground">
              Executives and admins ensure a safe, productive environment through moderation and oversight.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
