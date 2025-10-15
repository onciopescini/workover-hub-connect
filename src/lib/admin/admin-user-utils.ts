
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminProfile } from "@/types/admin";
import { logger } from "@/lib/logger";

export const getAllUsers = async (): Promise<AdminProfile[]> => {
  try {
    logger.info("Starting getAllUsers fetch");
    
    // Verify admin status first
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser?.user) {
      logger.warn("No authenticated user found");
      return [];
    }

    logger.debug("Current user authenticated", { userId: currentUser.user.id });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', currentUser.user.id)
      .single();

    logger.debug("User profile retrieved", { 
      role: profile?.role || 'unknown',
      suspended: profile?.is_suspended ?? false
    });

    if (!profile || profile.role !== 'admin' || profile.is_suspended) {
      logger.warn("User is not admin or is suspended", {
        role: profile?.role || 'unknown',
        suspended: profile?.is_suspended ?? false
      });
      return [];
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, role, is_suspended, suspension_reason, created_at, updated_at, last_login_at, stripe_connected, onboarding_completed")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Database error fetching users", {}, error);
      throw error;
    }
    
    logger.info("Successfully fetched user profiles", { count: data?.length || 0 });
    
    return data as AdminProfile[]; // TODO: Replace with proper type validation
  } catch (error) {
    logger.error("Error fetching users", {}, error as Error);
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
    
    const result = data as { success: boolean; error?: string; message?: string }; // TODO: Replace with proper type validation
    if (!result.success) {
      throw new Error(result.error || "Failed to suspend user");
    }

    toast.success("Utente sospeso con successo");
  } catch (error) {
    logger.error("Error suspending user", { userId, reason }, error as Error);
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
    
    const result = data as { success: boolean; error?: string; message?: string }; // TODO: Replace with proper type validation
    if (!result.success) {
      throw new Error(result.error || "Failed to reactivate user");
    }

    toast.success("Utente riattivato con successo");
  } catch (error) {
    logger.error("Error reactivating user", { userId }, error as Error);
    toast.error("Errore nella riattivazione dell'utente");
    throw error;
  }
};
