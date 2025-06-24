
import { supabase } from "@/integrations/supabase/client";
import { AdminActionLog } from "@/types/admin";

// Admin actions log
export const getAdminActionsLog = async (): Promise<AdminActionLog[]> => {
  try {
    console.log("getAdminActionsLog: Starting fetch...");
    
    // Verify admin status first
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser?.user) {
      console.log("getAdminActionsLog: No authenticated user");
      return [];
    }

    console.log("getAdminActionsLog: Current user ID:", currentUser.user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', currentUser.user.id)
      .single();

    console.log("getAdminActionsLog: Current user profile:", profile);

    if (!profile || profile.role !== 'admin' || profile.is_suspended) {
      console.log("getAdminActionsLog: User is not admin or is suspended");
      return [];
    }
    
    const { data, error } = await supabase
      .from("admin_actions_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("getAdminActionsLog: Database error:", error);
      throw error;
    }
    
    console.log("getAdminActionsLog: Fetched logs:", data?.length || 0, "entries");
    console.log("getAdminActionsLog: Sample logs:", data?.slice(0, 3));
    
    return data as AdminActionLog[];
  } catch (error) {
    console.error("getAdminActionsLog: Error fetching admin actions log:", error);
    throw error;
  }
};
