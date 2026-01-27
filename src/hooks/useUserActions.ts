import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminUserWithRoles } from '@/types/admin-user';
import { sreLogger } from '@/lib/sre-logger';
import { banUser, unbanUser } from '@/lib/admin-utils';
import type { Database } from "@/integrations/supabase/types";
import type { PostgrestError } from "@supabase/supabase-js";

export const useUserActions = (updateUser: (userId: string, updates: Partial<AdminUserWithRoles>) => void) => {
  type RoleRpcResult = { success: boolean; error?: string };

  const callRoleRpc = async (fn: string, args: Record<string, string>): Promise<{
    data: RoleRpcResult | null;
    error: PostgrestError | null;
  }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (supabase.rpc as any)(fn, args);
    return result as {
      data: RoleRpcResult | null;
      error: PostgrestError | null;
    };
  };

  const handleActivateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: false })
        .eq('id', userId);

      if (error) {
        sreLogger.error('Error activating user', { userId }, error as Error);
        toast.error('Failed to activate user');
        return;
      }

      updateUser(userId, { is_suspended: false });
      toast.success('User activated successfully');
    } catch (error) {
      sreLogger.error('Error activating user', { userId }, error as Error);
      toast.error('Failed to activate user');
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: true })
        .eq('id', userId);

      if (error) {
        sreLogger.error('Error deactivating user', { userId }, error as Error);
        toast.error('Failed to deactivate user');
        return;
      }

      updateUser(userId, { is_suspended: true });
      toast.success('User deactivated successfully');
    } catch (error) {
      sreLogger.error('Error deactivating user', { userId }, error as Error);
      toast.error('Failed to deactivate user');
    }
  };

  const handleBanUser = async (userId: string, reason: string) => {
    try {
      await banUser(userId, reason);
      updateUser(userId, { banned_at: new Date().toISOString(), ban_reason: reason });
    } catch (error) {
      sreLogger.error('Error banning user', { userId }, error as Error);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      await unbanUser(userId);
      updateUser(userId, { banned_at: null, ban_reason: null });
    } catch (error) {
      sreLogger.error('Error unbanning user', { userId }, error as Error);
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error('Devi essere autenticato');
        return;
      }

      const { data, error } = await callRoleRpc('assign_admin_role', {
        target_user_id: userId,
        assigned_by: user.user.id
      });

      if (error) {
        sreLogger.error('Error promoting user to admin', { userId }, error);
        toast.error('Errore nella promozione ad admin');
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Errore nella promozione ad admin');
        return;
      }

      toast.success('Utente promosso ad admin con successo');
      updateUser(userId, {}); // Trigger refresh
    } catch (error) {
      sreLogger.error('Error promoting user to admin', { userId }, error as Error);
      toast.error('Errore nella promozione ad admin');
    }
  };

  const handleDemoteFromAdmin = async (userId: string) => {
    try {
      const { data, error } = await callRoleRpc('remove_admin_role', {
        target_user_id: userId
      });

      if (error) {
        sreLogger.error('Error demoting user from admin', { userId }, error);
        toast.error('Errore nella rimozione del ruolo admin');
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Errore nella rimozione del ruolo admin');
        return;
      }

      toast.success('Ruolo admin rimosso con successo');
      updateUser(userId, {}); // Trigger refresh
    } catch (error) {
      sreLogger.error('Error demoting user from admin', { userId }, error as Error);
      toast.error('Errore nella rimozione del ruolo admin');
    }
  };

  const handlePromoteToModerator = async (userId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error('Devi essere autenticato');
        return;
      }

      const { data, error } = await callRoleRpc('assign_moderator_role', {
        target_user_id: userId,
        assigned_by_admin: user.user.id
      });

      if (error) {
        sreLogger.error('Error promoting user to moderator', { userId }, error);
        toast.error('Errore nella promozione a moderator');
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Errore nella promozione a moderator');
        return;
      }

      toast.success('Utente promosso a moderator con successo');
      updateUser(userId, {}); // Trigger refresh
    } catch (error) {
      sreLogger.error('Error promoting user to moderator', { userId }, error as Error);
      toast.error('Errore nella promozione a moderator');
    }
  };

  const handleDemoteFromModerator = async (userId: string) => {
    try {
      const { data, error } = await callRoleRpc('remove_moderator_role', {
        target_user_id: userId
      });

      if (error) {
        sreLogger.error('Error removing moderator role', { userId }, error);
        toast.error('Errore nella rimozione del ruolo moderator');
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Errore nella rimozione del ruolo moderator');
        return;
      }

      toast.success('Ruolo moderator rimosso con successo');
      updateUser(userId, {}); // Trigger refresh
    } catch (error) {
      sreLogger.error('Error removing moderator role', { userId }, error as Error);
      toast.error('Errore nella rimozione del ruolo moderator');
    }
  };

  return {
    handleActivateUser,
    handleDeactivateUser,
    handleBanUser,
    handleUnbanUser,
    handlePromoteToAdmin,
    handleDemoteFromAdmin,
    handlePromoteToModerator,
    handleDemoteFromModerator,
  };
};
