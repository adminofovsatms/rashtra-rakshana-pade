import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Radio, Users, X } from "lucide-react";

const LiveStream = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [streamId, setStreamId] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!userId) {
      navigate("/feed");
    }
  }, [userId, navigate]);

  const startStream = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your stream",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create stream record
      const { data: streamData, error } = await supabase
        .from("live_streams")
        .insert({
          user_id: userId!,
          title: title.trim(),
          description: description.trim() || null,
          stream_key: crypto.randomUUID(),
          is_live: true,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setStreamId(streamData.id);
      setIsStreaming(true);

      toast({
        title: "Live stream started!",
        description: "You're now broadcasting to all members"
      });

      // Subscribe to viewer updates
      const channel = supabase
        .channel(`live_stream_${streamData.id}`)
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          setViewers(Object.keys(state).length);
        })
        .subscribe();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const endStream = async () => {
    try {
      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Update stream record
      if (streamId) {
        await supabase
          .from("live_streams")
          .update({
            is_live: false,
            ended_at: new Date().toISOString()
          })
          .eq("id", streamId);
      }

      setIsStreaming(false);
      toast({
        title: "Stream ended",
        description: "Your live stream has been stopped"
      });

      setTimeout(() => navigate("/feed"), 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Radio className={isStreaming ? "animate-pulse text-destructive" : ""} />
            Live Stream
          </h1>
          <Button variant="outline" onClick={() => navigate("/feed")}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video bg-black rounded-lg mb-4"
            />
            
            {isStreaming && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-destructive rounded-full animate-pulse" />
                  <span className="font-semibold">LIVE</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{viewers} viewers</span>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            {!isStreaming ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Stream Details</h2>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Enter stream title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description (Optional)</label>
                  <Textarea
                    placeholder="What's your stream about?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button onClick={startStream} className="w-full" size="lg">
                  <Radio className="h-5 w-5 mr-2" />
                  Start Broadcasting
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">{title}</h2>
                {description && (
                  <p className="text-muted-foreground">{description}</p>
                )}
                <div className="pt-4">
                  <Button 
                    onClick={endStream} 
                    variant="destructive" 
                    className="w-full"
                    size="lg"
                  >
                    End Stream
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveStream;
