
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GlobalTag } from "@/types/admin";
import { sreLogger } from '@/lib/sre-logger';

// Tag management functions
export const getAllTags = async (): Promise<GlobalTag[]> => {
  try {
    const { data, error } = await supabase
      .from("global_tags")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as GlobalTag[];
  } catch (error) {
    sreLogger.error('Error fetching tags', {}, error as Error);
    throw error;
  }
};

export const approveTag = async (tagId: string): Promise<void> => {
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    const { data, error } = await supabase.rpc("approve_tag", {
      tag_id: tagId,
      approver_id: currentUser.user.id
    });

    if (error) throw error;
    
    const result = data as { success: boolean; error?: string; message?: string }; // TODO: Replace with proper type validation
    if (!result.success) {
      throw new Error(result.error || "Failed to approve tag");
    }

    toast.success("Tag approvato con successo");
  } catch (error) {
    sreLogger.error('Error approving tag', { tagId }, error as Error);
    toast.error("Errore nell'approvazione del tag");
    throw error;
  }
};
