import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Image, Video, BarChart3, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CreatePostProps {
  userId: string;
}

const CreatePost = ({ userId }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [postType, setPostType] = useState<"text" | "image" | "video" | "poll">("text");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreatePost = async () => {
    if (!content.trim() && postType === "text") {
      toast({
        title: "Content required",
        description: "Please enter some content for your post",
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

    setLoading(true);

    try {
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          content: content.trim() || null,
          post_type: postType,
          media_url: mediaUrl.trim() || null
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
        <TabsList className="grid w-full grid-cols-4 mb-4">
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
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL (Storage integration placeholder)</Label>
            <Input
              id="imageUrl"
              placeholder="https://example.com/image.jpg"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
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
          <div className="space-y-2">
            <Label htmlFor="videoUrl">Video URL (Storage integration placeholder)</Label>
            <Input
              id="videoUrl"
              placeholder="https://example.com/video.mp4"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
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
      </Tabs>

      <Button onClick={handleCreatePost} disabled={loading} className="w-full mt-4">
        <Send className="h-4 w-4 mr-2" />
        {loading ? "Posting..." : "Post"}
      </Button>
    </Card>
  );
};

export default CreatePost;
