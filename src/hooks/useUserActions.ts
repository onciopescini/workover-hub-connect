import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminUser } from '@/types/admin-user';
import { sreLogger } from '@/lib/sre-logger';

export const useUserActions = (updateUser: (userId: string, updates: Partial<AdminUser>) => void) => {
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

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId);

      if (error) {
        sreLogger.error('Error promoting user to admin', { userId }, error as Error);
        toast.error('Failed to promote user to admin');
        return;
      }

      updateUser(userId, { role: 'admin' });
      toast.success('User promoted to admin successfully');
    } catch (error) {
      sreLogger.error('Error promoting user to admin', { userId }, error as Error);
      toast.error('Failed to promote user to admin');
    }
  };

  const handleDemoteFromAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'coworker' })
        .eq('id', userId);

      if (error) {
        sreLogger.error('Error demoting user from admin', { userId }, error as Error);
        toast.error('Failed to demote user from admin');
        return;
      }

      updateUser(userId, { role: 'coworker' });
      toast.success('User demoted from admin successfully');
    } catch (error) {
      sreLogger.error('Error demoting user from admin', { userId }, error as Error);
      toast.error('Failed to demote user from admin');
    }
  };

  return {
    handleActivateUser,
    handleDeactivateUser,
    handlePromoteToAdmin,
    handleDemoteFromAdmin
  };
};
