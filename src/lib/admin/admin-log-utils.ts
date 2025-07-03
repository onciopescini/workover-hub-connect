
import { supabase } from "@/integrations/supabase/client";
import { AdminActionLog } from "@/types/admin";
import { logger } from "@/lib/logger";

// Create contextual logger for admin log utils
const adminLogger = logger;

// Admin actions log
export const getAdminActionsLog = async (): Promise<AdminActionLog[]> => {
  try {
    adminLogger.info("Starting admin actions log fetch");
    
    // Verify admin status first
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser?.user) {
      adminLogger.warn("No authenticated user found for admin log fetch");
      return [];
    }

    adminLogger.debug("Admin log fetch - user ID", { 
      metadata: { userId: currentUser.user.id }
    });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', currentUser.user.id)
      .single();

    adminLogger.debug("Admin log fetch - user profile", { 
      metadata: { 
        profileRole: profile?.role || 'unknown', 
        suspended: profile?.is_suspended ?? false 
      }
    });

    if (!profile || profile.role !== 'admin' || profile.is_suspended) {
      adminLogger.warn("User is not admin or is suspended", { 
        metadata: { 
          role: profile?.role || 'unknown', 
          suspended: profile?.is_suspended ?? false
        }
      });
      return [];
    }
    
    const { data, error } = await supabase
      .from("admin_actions_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      adminLogger.error("Database error fetching admin logs", {}, error);
      throw error;
    }
    
    adminLogger.info("Successfully fetched admin actions log", { 
      metadata: {
        count: data?.length || 0,
        sampleCount: Math.min(3, data?.length || 0)
      }
    });
    
    return data as AdminActionLog[];
  } catch (error) {
    adminLogger.error("Error fetching admin actions log", {}, error as Error);
    throw error;
  }
};
