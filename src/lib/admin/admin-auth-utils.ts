
import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

// Check if current user is admin (uses RPC for security)
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const { data: isAdmin, error } = await supabase.rpc('is_admin', { 
      p_user_id: user.user.id 
    });

    if (error) {
      sreLogger.error('Error checking admin status', {}, error);
      return false;
    }

    return isAdmin === true;
  } catch (error) {
    sreLogger.error('Error checking admin status', {}, error as Error);
    return false;
  }
};

// Check if current user is moderator (uses RPC for security)
export const isCurrentUserModerator = async (): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const { data: isModerator, error } = await supabase.rpc('is_moderator', { 
      user_id: user.user.id 
    });

    if (error) {
      sreLogger.error('Error checking moderator status', {}, error);
      return false;
    }

    return isModerator === true;
  } catch (error) {
    sreLogger.error('Error checking moderator status', {}, error as Error);
    return false;
  }
};

// Check if current user can moderate content (admin OR moderator)
export const canModerateContent = async (): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const { data: canModerate, error } = await supabase.rpc('can_moderate_content', { 
      user_id: user.user.id 
    });

    if (error) {
      sreLogger.error('Error checking moderation permissions', {}, error);
      return false;
    }

    return canModerate === true;
  } catch (error) {
    sreLogger.error('Error checking moderation permissions', {}, error as Error);
    return false;
  }
};
