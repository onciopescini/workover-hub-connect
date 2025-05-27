
import { supabase } from "@/integrations/supabase/client";
import { ReportInsert, Report } from "@/types/report";
import { toast } from "sonner";

// Create a new report
export const createReport = async (reportData: Omit<ReportInsert, 'reporter_id'>): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      toast.error("Devi essere autenticato per segnalare");
      return false;
    }

    const { error } = await supabase
      .from('reports')
      .insert({
        ...reportData,
        reporter_id: user.user.id
      });

    if (error) throw error;
    
    toast.success("Segnalazione inviata con successo");
    return true;
  } catch (error) {
    console.error("Error creating report:", error);
    toast.error("Errore nell'invio della segnalazione");
    return false;
  }
};

// Get user's reports
export const getUserReports = async (): Promise<Report[]> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return [];

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', user.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
};

// Admin function to get all reports
export const getAllReports = async (): Promise<Report[]> => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching all reports:", error);
    return [];
  }
};

// Admin function to review report
export const reviewReport = async (
  reportId: string, 
  status: string, 
  adminNotes?: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('review_report', {
      report_id: reportId,
      new_status: status,
      admin_notes: adminNotes
    });

    if (error) throw error;
    
    const result = data as { success?: boolean; error?: string };
    
    if (result?.success) {
      toast.success("Segnalazione aggiornata con successo");
      return true;
    } else {
      toast.error(result?.error || "Errore nell'aggiornamento della segnalazione");
      return false;
    }
  } catch (error) {
    console.error("Error reviewing report:", error);
    toast.error("Errore nell'aggiornamento della segnalazione");
    return false;
  }
};
