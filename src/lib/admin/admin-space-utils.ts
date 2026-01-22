
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminSpace } from "@/types/admin";
import { sreLogger } from '@/lib/sre-logger';

// Space management functions
export const getAllSpaces = async (): Promise<AdminSpace[]> => {
  try {
    const { data, error } = await supabase
      .from("spaces")
      .select("*, title:name, workspace_features:features")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as unknown as AdminSpace[];
  } catch (error) {
    sreLogger.error('Error fetching spaces', {}, error as Error);
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
    sreLogger.error('Error moderating space', { spaceId, approve }, error as Error);
    toast.error("Errore nella moderazione dello spazio");
    throw error;
  }
};

export const suspendSpace = async (spaceId: string, reason: string): Promise<void> => {
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from('spaces')
      .update({
        is_suspended: true,
        suspension_reason: reason,
        suspended_at: new Date().toISOString(),
        suspended_by: currentUser.user.id
      })
      .eq('id', spaceId);

    if (error) throw error;

    toast.success("Spazio sospeso con successo");
  } catch (error) {
    sreLogger.error('Error suspending space', { spaceId, reason }, error as Error);
    toast.error("Errore nella sospensione dello spazio");
    throw error;
  }
};

export const unsuspendSpace = async (spaceId: string): Promise<void> => {
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from('spaces')
      .update({
        is_suspended: false,
        suspension_reason: null,
        suspended_at: null,
        suspended_by: null
      })
      .eq('id', spaceId);

    if (error) throw error;

    toast.success("Spazio riattivato con successo");
  } catch (error) {
    sreLogger.error('Error unsuspending space', { spaceId }, error as Error);
    toast.error("Errore nella riattivazione dello spazio");
    throw error;
  }
};
