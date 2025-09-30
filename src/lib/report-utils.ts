import { supabase } from "@/integrations/supabase/client";
import { ReportInsert, Report } from "@/types/report";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

// Create a new report
export const createReport = async (reportData: Omit<ReportInsert, 'reporter_id'>): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      toast.error("Devi essere autenticato per segnalare");
      return false;
    }

    sreLogger.debug("Creating report", {
      component: 'ReportUtils',
      action: 'createReport',
      reporterId: user.user.id,
      targetType: reportData.target_type,
      targetId: reportData.target_id
    });

    const { error } = await supabase
      .from('reports')
      .insert({
        ...reportData,
        reporter_id: user.user.id
      });

    if (error) {
      sreLogger.error("Error creating report", {
        component: 'ReportUtils',
        action: 'createReport',
        reporterId: user.user.id,
        targetType: reportData.target_type
      }, error as Error);
      throw error;
    }
    
    toast.success("Segnalazione inviata con successo");
    return true;
  } catch (error) {
    sreLogger.error("Error creating report", {
      component: 'ReportUtils',
      action: 'createReport',
      targetType: reportData.target_type
    }, error as Error);
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
    
    return (data || []).map(report => ({
      ...report,
      status: report.status ?? 'open',
      admin_notes: report.admin_notes ?? '',
      description: report.description ?? '',
      created_at: report.created_at ?? '',
      reviewed_at: report.reviewed_at ?? '',
      updated_at: report.updated_at ?? ''
    }));
  } catch (error) {
    const { data: user } = await supabase.auth.getUser();
    sreLogger.error("Error fetching reports", {
      component: 'ReportUtils',
      action: 'getUserReports',
      userId: user?.user?.id
    }, error as Error);
    return [];
  }
};

// Admin function to get all reports with reporter information
export const getAllReports = async (): Promise<Report[]> => {
  try {
    sreLogger.debug("Fetching all reports for admin", {
      component: 'ReportUtils',
      action: 'getAllReports'
    });
    
    // Check if current user is admin first
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser?.user) {
      sreLogger.debug("No authenticated user", {
        component: 'ReportUtils',
        action: 'getAllReports'
      });
      return [];
    }

    sreLogger.debug("Current user ID", {
      component: 'ReportUtils',
      action: 'getAllReports',
      userId: currentUser.user.id
    });

    // Verify admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', currentUser.user.id)
      .single();

    sreLogger.debug("User profile", {
      component: 'ReportUtils',
      action: 'getAllReports',
      userId: currentUser.user.id,
      role: profile?.role
    });

    if (!profile || profile.role !== 'admin' || profile.is_suspended) {
      sreLogger.debug("User is not admin or is suspended", {
        component: 'ReportUtils',
        action: 'getAllReports',
        userId: currentUser.user.id,
        role: profile?.role
      });
      return [];
    }
    
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        reporter:profiles!reporter_id(
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      sreLogger.error("Error fetching reports", {
        component: 'ReportUtils',
        action: 'getAllReports'
      }, error as Error);
      throw error;
    }
    
    sreLogger.debug("Fetched reports", {
      component: 'ReportUtils',
      action: 'getAllReports',
      reportsCount: data?.length || 0
    });
    
    return (data || []).map(report => ({
      ...report,
      status: report.status ?? 'open',
      admin_notes: report.admin_notes ?? '',
      description: report.description ?? '',
      created_at: report.created_at ?? '',
      reviewed_at: report.reviewed_at ?? '',
      updated_at: report.updated_at ?? ''
    }));
  } catch (error) {
    sreLogger.error("Error fetching all reports", {
      component: 'ReportUtils',
      action: 'getAllReports'
    }, error as Error);
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
    sreLogger.debug("Reviewing report", {
      component: 'ReportUtils',
      action: 'reviewReport',
      reportId,
      status
    });
    
    // Handle exactOptionalPropertyTypes for admin_notes
    const rpcParams: any = {
      report_id: reportId,
      new_status: status
    };
    
    if (adminNotes !== undefined) {
      rpcParams.admin_notes = adminNotes;
    }
    
    const { data, error } = await supabase.rpc('review_report', rpcParams);

    if (error) {
      sreLogger.error("Error reviewing report", {
        component: 'ReportUtils',
        action: 'reviewReport',
        reportId,
        status
      }, error as Error);
      throw error;
    }
    
    const result = data as { success?: boolean; error?: string };
    
    if (result?.success) {
      toast.success("Segnalazione aggiornata con successo");
      return true;
    } else {
      toast.error(result?.error || "Errore nell'aggiornamento della segnalazione");
      return false;
    }
  } catch (error) {
    sreLogger.error("Error reviewing report", {
      component: 'ReportUtils',
      action: 'reviewReport',
      reportId,
      status
    }, error as Error);
    toast.error("Errore nell'aggiornamento della segnalazione");
    return false;
  }
};
