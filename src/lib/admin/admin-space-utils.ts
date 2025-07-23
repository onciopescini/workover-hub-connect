
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminSpace } from "@/types/admin";

// Space management functions
export const getAllSpaces = async (): Promise<AdminSpace[]> => {
  try {
    const { data, error } = await supabase
      .from("spaces")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as AdminSpace[];
  } catch (error) {
    console.error("Error fetching spaces:", error);
    throw error;
  }
};

export const moderateSpace = async (spaceId: string, approve: boolean, rejectionReason?: string): Promise<void> => {
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    const rpcParams: { space_id: string; approve: boolean; moderator_id: string; rejection_reason?: string } = {
      space_id: spaceId,
      approve: approve,
      moderator_id: currentUser.user.id
    };

    if (rejectionReason) {
      rpcParams.rejection_reason = rejectionReason;
    }

    const { data, error } = await supabase.rpc("moderate_space", rpcParams);

    if (error) throw error;
    
    const result = data as { success: boolean; error?: string; message?: string }; // TODO: Replace with proper type validation
    if (!result.success) {
      throw new Error(result.error || "Failed to moderate space");
    }

    toast.success(approve ? "Spazio approvato" : "Spazio rifiutato");
  } catch (error) {
    console.error("Error moderating space:", error);
    toast.error("Errore nella moderazione dello spazio");
    throw error;
  }
};
