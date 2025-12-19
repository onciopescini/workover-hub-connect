
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

    // Check if user has admin role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.user.id);

    const roles = userRoles?.map(r => r.role) || [];
    if (!roles.includes('admin')) {
      logger.warn("User is not admin");
      toast.error("Accesso negato. Solo gli amministratori possono visualizzare questa pagina.");
      return [];
    }

    logger.debug("User has admin role");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, is_suspended, suspension_reason, created_at, updated_at, last_login_at, stripe_connected, onboarding_completed")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Database error fetching users", {}, error);
      throw error;
    }
    
    // Fetch roles for all users
    const { data: allRoles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    logger.debug("Fetched all user roles");

    // Map roles to users
    const usersWithRoles = data.map(user => {
      const userRolesList = allRoles?.filter(r => r.user_id === user.id).map(r => r.role) || [];
      return {
        ...user,
        role: userRolesList[0] || 'coworker', // Primary role for backward compatibility
        roles: userRolesList
      };
    });
    
    logger.info("Successfully fetched user profiles", { count: usersWithRoles.length });
    
    return usersWithRoles as AdminProfile[];
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

export const assignModeratorRole = async (userId: string): Promise<void> => {
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    const { error } = await supabase.rpc("assign_moderator_role", {
      target_user_id: userId,
      assigned_by_admin: currentUser.user.id
    });

    if (error) {
      logger.error("Failed to assign moderator role", { userId }, error);
      throw new Error("Errore nell'assegnazione del ruolo moderatore");
    }

    logger.info("Moderator role assigned", { userId });
    toast.success("Ruolo moderatore assegnato con successo");
  } catch (error) {
    logger.error("Error assigning moderator role", { userId }, error as Error);
    toast.error("Errore nell'assegnazione del ruolo moderatore");
    throw error;
  }
};

export const removeModeratorRole = async (userId: string): Promise<void> => {
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    const { error } = await supabase.rpc("remove_moderator_role", {
      target_user_id: userId,
      removed_by_admin: currentUser.user.id
    });

    if (error) {
      logger.error("Failed to remove moderator role", { userId }, error);
      throw new Error("Errore nella rimozione del ruolo moderatore");
    }

    logger.info("Moderator role removed", { userId });
    toast.success("Ruolo moderatore rimosso con successo");
  } catch (error) {
    logger.error("Error removing moderator role", { userId }, error as Error);
    toast.error("Errore nella rimozione del ruolo moderatore");
    throw error;
  }
};
