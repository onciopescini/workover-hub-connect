
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminWarning } from "@/types/admin";
import { sreLogger } from '@/lib/sre-logger';

// Warning management functions
export const createWarning = async (warning: Omit<AdminWarning, "id" | "created_at" | "updated_at">): Promise<void> => {
  try {
    const { error } = await supabase
      .from("admin_warnings")
      .insert({
        user_id: warning.user_id,
        admin_id: warning.admin_id,
        warning_type: warning.warning_type,
        title: warning.title,
        message: warning.message,
        severity: warning.severity,
        is_active: warning.is_active
      });

    if (error) throw error;
    toast.success("Warning inviato con successo");
  } catch (error) {
    sreLogger.error('Error creating warning', { warning }, error as Error);
    toast.error("Errore nell'invio del warning");
    throw error;
  }
};

export const getUserWarnings = async (userId: string): Promise<AdminWarning[]> => {
  try {
    const { data, error } = await supabase
      .from("admin_warnings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    // Map database response to AdminWarning type
    return (data || []).map(item => ({
      id: item.id,
      user_id: item.user_id,
      admin_id: item.admin_id,
      warning_type: item.warning_type,
      title: item.title,
      message: item.message,
      severity: item.severity as 'low' | 'medium' | 'high',
      is_active: item.is_active,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));
  } catch (error) {
    sreLogger.error('Error fetching user warnings', { userId }, error as Error);
    throw error;
  }
};
