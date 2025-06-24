
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminProfile } from "@/types/admin";

export const getAllUsers = async (): Promise<AdminProfile[]> => {
  try {
    console.log("getAllUsers: Starting fetch...");
    
    // Verify admin status first
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser?.user) {
      console.log("getAllUsers: No authenticated user");
      return [];
    }

    console.log("getAllUsers: Current user ID:", currentUser.user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', currentUser.user.id)
      .single();

    console.log("getAllUsers: Current user profile:", profile);

    if (!profile || profile.role !== 'admin' || profile.is_suspended) {
      console.log("getAllUsers: User is not admin or is suspended");
      return [];
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getAllUsers: Database error:", error);
      throw error;
    }
    
    console.log("getAllUsers: Fetched profiles:", data?.length || 0, "profiles");
    console.log("getAllUsers: Sample profiles:", data?.slice(0, 3));
    
    return data as AdminProfile[];
  } catch (error) {
    console.error("getAllUsers: Error fetching users:", error);
    throw error;
  }
};

export const suspendUser = async (userId: string, reason: string): Promise<void> => {
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    const { data, error } = await supabase.rpc("suspend_user", {
      target_user_id: userId,
      reason: reason,
      suspended_by_admin: currentUser.user.id
    });

    if (error) throw error;
    
    const result = data as { success: boolean; error?: string; message?: string };
    if (!result.success) {
      throw new Error(result.error || "Failed to suspend user");
    }

    toast.success("Utente sospeso con successo");
  } catch (error) {
    console.error("Error suspending user:", error);
    toast.error("Errore nella sospensione dell'utente");
    throw error;
  }
};

export const reactivateUser = async (userId: string): Promise<void> => {
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    const { data, error } = await supabase.rpc("reactivate_user", {
      target_user_id: userId,
      reactivated_by_admin: currentUser.user.id
    });

    if (error) throw error;
    
    const result = data as { success: boolean; error?: string; message?: string };
    if (!result.success) {
      throw new Error(result.error || "Failed to reactivate user");
    }

    toast.success("Utente riattivato con successo");
  } catch (error) {
    console.error("Error reactivating user:", error);
    toast.error("Errore nella riattivazione dell'utente");
    throw error;
  }
};
