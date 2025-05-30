
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Funzione per testare la creazione di log delle azioni admin
export const testAdminActionLogging = async (): Promise<boolean> => {
  try {
    console.log("Testing admin action logging...");
    
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      console.log("No authenticated user");
      return false;
    }

    console.log("Current user ID:", user.user.id);

    // Verifica che l'utente sia admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', user.user.id)
      .single();

    console.log("User profile:", profile);

    if (!profile || profile.role !== 'admin' || profile.is_suspended) {
      console.log("User is not admin or is suspended");
      return false;
    }

    // Crea un log di test
    const { error } = await supabase
      .from('admin_actions_log')
      .insert({
        admin_id: user.user.id,
        action_type: 'admin_panel_access',
        target_type: 'system',
        target_id: user.user.id,
        description: 'Admin accessed the admin panel - Test log entry',
        metadata: {
          timestamp: new Date().toISOString(),
          test: true
        }
      });

    if (error) {
      console.error("Error creating test log:", error);
      return false;
    }

    console.log("Test log created successfully");
    return true;
  } catch (error) {
    console.error("Error in testAdminActionLogging:", error);
    return false;
  }
};

// Funzione per creare log quando l'admin visualizza una sezione
export const logAdminSectionView = async (section: string): Promise<void> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.user.id)
      .single();

    if (profile?.role !== 'admin') return;

    await supabase
      .from('admin_actions_log')
      .insert({
        admin_id: user.user.id,
        action_type: 'admin_panel_view',
        target_type: 'admin_section',
        target_id: user.user.id,
        description: `Admin viewed ${section} section`,
        metadata: {
          section,
          timestamp: new Date().toISOString()
        }
      });

    console.log(`Logged admin view of ${section} section`);
  } catch (error) {
    console.error("Error logging admin section view:", error);
  }
};
