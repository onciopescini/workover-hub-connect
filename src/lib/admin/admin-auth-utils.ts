
import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

// Check if current user is admin
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_suspended")
      .eq("id", user.user.id)
      .single();

    return profile?.role === "admin" && !profile?.is_suspended;
  } catch (error) {
    sreLogger.error('Error checking admin status', {}, error as Error);
    return false;
  }
};
