import { Dialog, DialogContent } from "@/components/ui/dialog";
import PostCard from "./PostCard";

interface PostModalProps {
  post: any;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  isMuted: boolean;
  onMuteToggle: (muted: boolean) => void;
  onPostDeleted?: () => void;
}

const PostModal = ({ 
  post, 
  isOpen, 
  onClose, 
  currentUserId, 
  isMuted, 
  onMuteToggle,
  onPostDeleted 
}: PostModalProps) => {
  
  const handlePostDeleted = () => {
    onPostDeleted?.();
    onClose(); // Close modal after deletion
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        <PostCard
          post={post}
          currentUserId={currentUserId}
          isMuted={isMuted}
          onMuteToggle={onMuteToggle}
          onPostDeleted={handlePostDeleted}
          isDetailView={true}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PostModal;