import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

// Funzione per testare la creazione di log delle azioni admin
export const testAdminActionLogging = async (): Promise<boolean> => {
  try {
    sreLogger.debug('Testing admin action logging', { context: 'testAdminActionLogging' });
    
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      sreLogger.debug('No authenticated user', { context: 'testAdminActionLogging' });
      return false;
    }

    sreLogger.debug('Current user ID', { context: 'testAdminActionLogging', userId: user.user.id });

    // Verifica che l'utente sia admin usando user_roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.user.id);
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', user.user.id)
      .single();

    sreLogger.debug('User profile', { context: 'testAdminActionLogging', profile, roles: rolesData });

    const isAdmin = rolesData?.some(r => r.role === 'admin');
    if (!isAdmin || profile?.is_suspended) {
      sreLogger.debug('User is not admin or is suspended', { 
        context: 'testAdminActionLogging',
        isAdmin,
        isSuspended: profile?.is_suspended
      });
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
      sreLogger.error('Error creating test log', { 
        context: 'testAdminActionLogging',
        adminId: user.user.id
      }, error as Error);
      return false;
    }

    sreLogger.info('Test log created successfully', { 
      context: 'testAdminActionLogging',
      adminId: user.user.id
    });
    return true;
  } catch (error) {
    sreLogger.error('Error in testAdminActionLogging', { 
      context: 'testAdminActionLogging' 
    }, error as Error);
    return false;
  }
};

// Funzione per creare log quando l'admin visualizza una sezione
export const logAdminSectionView = async (section: string): Promise<void> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.user.id);

    const isAdmin = rolesData?.some(r => r.role === 'admin');
    if (!isAdmin) return;

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

    sreLogger.info('Logged admin view of section', { 
      context: 'logAdminSectionView',
      section,
      adminId: user.user.id
    });
  } catch (error) {
    sreLogger.error('Error logging admin section view', { 
      context: 'logAdminSectionView',
      section 
    }, error as Error);
  }
};
