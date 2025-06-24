
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GlobalTag } from "@/types/admin";

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
    console.error("Error fetching tags:", error);
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
    
    const result = data as { success: boolean; error?: string; message?: string };
    if (!result.success) {
      throw new Error(result.error || "Failed to approve tag");
    }

    toast.success("Tag approvato con successo");
  } catch (error) {
    console.error("Error approving tag:", error);
    toast.error("Errore nell'approvazione del tag");
    throw error;
  }
};
