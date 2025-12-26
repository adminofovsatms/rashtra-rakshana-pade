import { supabase } from "@/integrations/supabase/client";

export const toggleUserPin = async (postId: string, userId: string, currentPinStatus: boolean) => {
  try {
    const { error } = await supabase
      .from("posts")
      .update({ 
        user_pinned: !currentPinStatus, 
        user_pinned_at: !currentPinStatus ? new Date().toISOString() : null 
      })
      .eq("id", postId)
      .eq("user_id", userId); // Ensure user owns the post

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const toggleAdminPin = async (postId: string, currentPinStatus: boolean) => {
  try {
    const { error } = await supabase
      .from("posts")
      .update({ 
        admin_pinned: !currentPinStatus,
        admin_pinned_at: !currentPinStatus ? new Date().toISOString() : null,
        user_pinned: !currentPinStatus,
        user_pinned_at: !currentPinStatus ? new Date().toISOString() : null
      })
      .eq("id", postId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};