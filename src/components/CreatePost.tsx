import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Image, Video, BarChart3, Send, Upload, Radio } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface CreatePostProps {
  userId: string;
}

const CreatePost = ({ userId }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [postType, setPostType] = useState<"text" | "image" | "video" | "poll" | "live">("text");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
          variant: "destructive"
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleCreatePost = async () => {
    if (!content.trim() && postType === "text") {
      toast({
        title: "Content required",
        description: "Please enter some content for your post",
        variant: "destructive"
      });
      return;
    }

    if ((postType === "image" || postType === "video") && !mediaFile) {
      toast({
        title: "Media required",
        description: `Please upload a ${postType} file`,
        variant: "destructive"
      });
      return;
    }

    if (postType === "poll" && pollOptions.filter(opt => opt.trim()).length < 2) {
      toast({
        title: "Poll options required",
        description: "Please provide at least 2 poll options",
        variant: "destructive"
      });
      return;
    }

    if (postType === "live") {
      // Redirect to live stream page
      window.location.href = `/live-stream?userId=${userId}`;
      return;
    }

    setLoading(true);

    try {
      let uploadedUrl = null;
      
      if (mediaFile) {
        const bucket = postType === "image" ? "post-images" : "post-videos";
        uploadedUrl = await uploadFile(mediaFile, bucket);
      }

      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          content: content.trim() || null,
          post_type: postType,
          media_url: uploadedUrl
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
        description: "Your post has been shared with the community"
      });

      setContent("");
      setMediaFile(null);
      setMediaUrl("");
      setPollOptions(["", ""]);
      setPostType("text");
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

  return (
    <Card className="p-6 animate-fade-in">
      <Tabs value={postType} onValueChange={(v) => setPostType(v as any)}>
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="image">
            <Image className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="video">
            <Video className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="poll">
            <BarChart3 className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="live">
            <Radio className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </TabsContent>

        <TabsContent value="image" className="space-y-4">
          <Textarea
            placeholder="Share your thoughts about this image..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            {mediaFile ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{mediaFile.name}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaFile(null)}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop an image, or
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                >
                  Select Image
                </Button>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <Textarea
            placeholder="Share your thoughts about this video..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Video className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            {mediaFile ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{mediaFile.name}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaFile(null)}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop a video, or
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => videoInputRef.current?.click()}
                >
                  Select Video
                </Button>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="poll" className="space-y-4">
          <Textarea
            placeholder="Ask a question..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <div className="space-y-2">
            <Label>Poll Options</Label>
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
              />
            ))}
            {pollOptions.length < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPollOptions([...pollOptions, ""])}
              >
                Add Option
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="live" className="space-y-4">
          <div className="text-center py-8">
            <Radio className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
            <h3 className="text-lg font-semibold mb-2">Start Live Stream</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Broadcast live to all members in real-time
            </p>
            <Button onClick={handleCreatePost} disabled={loading} size="lg">
              <Radio className="h-5 w-5 mr-2" />
              Go Live
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {postType !== "live" && (
        <Button onClick={handleCreatePost} disabled={loading} className="w-full mt-4">
          <Send className="h-4 w-4 mr-2" />
          {loading ? "Posting..." : "Post"}
        </Button>
      )}
    </Card>
  );
};

export default CreatePost;
