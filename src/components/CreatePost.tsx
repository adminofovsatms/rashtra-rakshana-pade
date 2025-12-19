import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Image, Video, BarChart3, Send, Upload, Radio, Megaphone, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";

interface CreatePostProps {
  userId: string;
  userRole?: string | null;
}

const CreatePost = ({ userId, userRole }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [postType, setPostType] = useState<"text" | "image" | "video" | "poll" | "live">("text");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [location, setLocation] = useState<string>("");
  const [locationLoading, setLocationLoading] = useState(true);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const presignedUrlApi = `${import.meta.env.VITE_BACKEND_URL}/api/get-upload-url`;

  useEffect(() => {
    const getUserLocation = async () => {
      if (!navigator.geolocation) {
        setLocationLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
            console.warn("Google Maps API key not configured");
            setLocationLoading(false);
            return;
          }

          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
            );
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
              const addressComponents = data.results[0].address_components;
              const city = addressComponents.find((component: any) =>
                component.types.includes("locality")
              )?.long_name;
              
              if (city) {
                setLocation(city);
              }
            }
          } catch (error) {
            console.error("Error fetching location:", error);
          } finally {
            setLocationLoading(false);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationLoading(false);
        }
      );
    };

    getUserLocation();
  }, []);

  useEffect(() => {
    if (mediaFile) {
      const objectUrl = URL.createObjectURL(mediaFile);
      setPreviewUrl(objectUrl);
      
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreviewUrl("");
    }
  }, [mediaFile]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (postType === "image" && file.type.startsWith("image/")) {
        setMediaFile(file);
      } else if (postType === "video" && file.type.startsWith("video/")) {
        setMediaFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: `Please upload a ${postType} file`,
          variant: "destructive",
          duration: 1000
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File, type: "image" | "video"): Promise<string | null> => {
    try {
      const response = await fetch(presignedUrlApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          file_type: type,
          file_name: file.name,
          content_type: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { upload_url, public_url } = await response.json();

      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      return public_url;

    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const handleCreatePost = async () => {
    if (!content.trim() && postType === "text") {
      toast({
        title: "Content required",
        description: "Please enter some content for your post",
        variant: "destructive",
        duration: 1000
      });
      return;
    }

    if ((postType === "image" || postType === "video") && !mediaFile) {
      toast({
        title: "Media required",
        description: `Please upload a ${postType} file`,
        variant: "destructive",
        duration: 1000
      });
      return;
    }

    if (postType === "poll" && pollOptions.filter(opt => opt.trim()).length < 2) {
      toast({
        title: "Poll options required",
        description: "Please provide at least 2 poll options",
        variant: "destructive",
        duration: 1000
      });
      return;
    }

    if (postType === "live") {
      window.location.href = `/live-stream?userId=${userId}`;
      return;
    }

    setLoading(true);

    try {
      let uploadedUrl = null;
      
      if (mediaFile && (postType === "image" || postType === "video")) {
        uploadedUrl = await uploadFile(mediaFile, postType);
      }

      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          content: content.trim() || null,
          post_type: postType,
          media_url: uploadedUrl,
          location: location || null
        })
        .select()
        .single();

      if (postError) throw postError;

      if (postType === "poll" && post) {
        const options = pollOptions
          .filter(opt => opt.trim())
          .map(opt => ({
            post_id: post.id,
            option_text: opt.trim()
          }));

        const { error: pollError } = await supabase
          .from("poll_options")
          .insert(options);

        if (pollError) throw pollError;
      }

      toast({
        title: "Post created!",
        description: "Your post has been shared with Hindu Unity",
        duration: 1000
      });

      setContent("");
      setMediaFile(null);
      setMediaUrl("");
      setPreviewUrl("");
      setPollOptions(["", ""]);
      setPostType("text");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 1000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-3 animate-fade-in">
      {locationLoading && (
        <div className="mb-2 text-xs text-muted-foreground flex items-center gap-1">
          <div className="h-2 w-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Detecting location...
        </div>
      )}
      {!locationLoading && location && (
        <div className="mb-2 text-xs text-muted-foreground">
          📍 {location}
        </div>
      )}
      <Tabs value={postType} onValueChange={(v) => setPostType(v as any)}>
        <TabsList className="grid w-full grid-cols-6 mb-2 h-8">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="text" className="text-xs h-7">Text</TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Create Text Post</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="image" className="h-7">
                  <Image className="h-3 w-3" />
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Create Image Post</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="video" className="h-7">
                  <Video className="h-3 w-3" />
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Create Video Post</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="poll" className="h-7">
                  <BarChart3 className="h-3 w-3" />
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Create Poll</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="live" className="h-7">
                  <Radio className="h-3 w-3" />
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Start Live Stream</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {userRole && (userRole === "volunteer" || userRole === "executive" || userRole === "super_admin") && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/organise-protest")}
                    className="h-7 px-2"
                  >
                    <Megaphone className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Organize Protest</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </TabsList>

        <TabsContent value="text" className="space-y-2 mt-2">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
        </TabsContent>

        <TabsContent value="image" className="space-y-2 mt-2">
          <Textarea
            placeholder="Share your thoughts..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
          {mediaFile && previewUrl ? (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden border">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-auto max-h-64 object-contain bg-muted"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => setMediaFile(null)}
                  className="absolute top-1 right-1 h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">{mediaFile.name}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                className="w-full h-7 text-xs"
                size="sm"
              >
                Change Image
              </Button>
            </div>
          ) : (
            <div 
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mb-2">
                Drag and drop, or
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                size="sm"
                className="h-7 text-xs"
              >
                Select Image
              </Button>
            </div>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </TabsContent>

        <TabsContent value="video" className="space-y-2 mt-2">
          <Textarea
            placeholder="Share your thoughts..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
          {mediaFile && previewUrl ? (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden border">
                <video 
                  src={previewUrl} 
                  controls 
                  className="w-full h-auto max-h-64 bg-muted"
                >
                  Your browser does not support the video tag.
                </video>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => setMediaFile(null)}
                  className="absolute top-1 right-1 h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">{mediaFile.name}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => videoInputRef.current?.click()}
                className="w-full h-7 text-xs"
                size="sm"
              >
                Change Video
              </Button>
            </div>
          ) : (
            <div 
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Video className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mb-2">
                Drag and drop, or
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => videoInputRef.current?.click()}
                size="sm"
                className="h-7 text-xs"
              >
                Select Video
              </Button>
            </div>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </TabsContent>

        <TabsContent value="poll" className="space-y-2 mt-2">
          <Textarea
            placeholder="Ask a question..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
          <div className="space-y-1">
            <Label className="text-xs">Poll Options</Label>
            {pollOptions.map((option, idx) => (
              <Input
                key={idx}
                placeholder={`Option ${idx + 1}`}
                value={option}
                onChange={(e) => {
                  const newOptions = [...pollOptions];
                  newOptions[idx] = e.target.value;
                  setPollOptions(newOptions);
                }}
                className="h-8 text-sm"
              />
            ))}
            {pollOptions.length < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPollOptions([...pollOptions, ""])}
                className="h-7 text-xs"
              >
                Add Option
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="live" className="space-y-2 mt-2">
          <div className="text-center py-4">
            <Radio className="h-12 w-12 mx-auto mb-2 text-primary animate-pulse" />
            <h3 className="text-base font-semibold mb-1">Start Live Stream</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Broadcast live to all members
            </p>
            <Button onClick={handleCreatePost} disabled={loading} size="sm" className="h-8 text-xs">
              <Radio className="h-3 w-3 mr-1" />
              Go Live
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {postType !== "live" && (
        <Button onClick={handleCreatePost} disabled={loading} className="w-full mt-2 h-8 text-xs">
          <Send className="h-3 w-3 mr-1" />
          {loading ? "Posting..." : "Post"}
        </Button>
      )}
    </Card>
  );
};

export default CreatePost;