/**
 * Privacy Service Layer
 * 
 * Gestisce richieste GDPR: export dati e cancellazione account.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

// ============= TYPES =============

export interface GDPRRequest {
  id: string;
  user_id: string;
  request_type: 'data_export' | 'data_deletion' | 'data_rectification';
  status: 'pending' | 'completed' | 'rejected';
  requested_at: string;
  completed_at: string | null;
  processed_by: string | null;
  export_file_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  fileSize?: number;
  error?: string;
}

export interface DeletionResult {
  success: boolean;
  error?: string;
}

// ============= GDPR REQUESTS =============

/**
 * Fetch user's GDPR requests history.
 */
export async function getGDPRRequests(userId: string): Promise<GDPRRequest[]> {
  const { data, error } = await supabase
    .from('gdpr_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    sreLogger.error('Error fetching GDPR requests', { component: 'privacyService', userId }, error as Error);
    throw error;
  }

  // Type cast the response to ensure proper typing
  const typedRequests: GDPRRequest[] = (data || []).map(request => ({
    ...request,
    request_type: request.request_type as GDPRRequest['request_type'],
    status: request.status as GDPRRequest['status'],
    created_at: request.created_at ?? '',
    completed_at: request.completed_at ?? null,
    updated_at: request.updated_at ?? ''
  }));

  return typedRequests;
}

// ============= DATA EXPORT =============

/**
 * Generate instant data export via Edge Function.
 */
export async function exportUserData(userId: string): Promise<ExportResult> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-gdpr-export', {
      body: { userId }
    });

    if (error) {
      sreLogger.error('Error generating GDPR export', { component: 'privacyService', userId }, error as Error);
      return { success: false, error: error.message };
    }

    if (!data?.downloadUrl) {
      sreLogger.error('No download URL in GDPR export response', { component: 'privacyService', userId });
      return { success: false, error: 'Nessun URL di download ricevuto' };
    }

    return {
      success: true,
      downloadUrl: data.downloadUrl,
      fileSize: data.fileSize || 0
    };
  } catch (err) {
    sreLogger.error('Exception during GDPR export', { component: 'privacyService', userId }, err as Error);
    return { success: false, error: 'Errore durante l\'esportazione' };
  }
}

// ============= ACCOUNT DELETION =============

/**
 * Check if user has a pending deletion request.
 */
export async function hasPendingDeletionRequest(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('gdpr_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('request_type', 'data_deletion')
    .eq('status', 'pending');

  if (error) {
    sreLogger.error('Error checking pending deletion requests', { component: 'privacyService', userId }, error as Error);
    throw error;
  }

  return data && data.length > 0;
}

/**
 * Request account deletion via RPC.
 */
export async function requestDeletion(userId: string, reason?: string): Promise<DeletionResult> {
  // Check for existing pending request
  try {
    const hasPending = await hasPendingDeletionRequest(userId);
    
    if (hasPending) {
      return { success: false, error: 'Hai già una richiesta di cancellazione in corso' };
    }
  } catch (err) {
    return { success: false, error: 'Errore verifica richieste esistenti' };
  }

  const { error } = await supabase.rpc('request_data_deletion', {
    target_user_id: userId,
    deletion_reason: reason || 'Richiesta cancellazione account tramite Privacy Center'
  });

  if (error) {
    sreLogger.error('Error requesting data deletion', { component: 'privacyService', userId }, error as Error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Confirm account deletion (used in confirmation flow).
 * This requires an active session with valid access token.
 */
export async function confirmAccountDeletion(reason: string): Promise<DeletionResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  
  if (!sessionData.session?.access_token) {
    return { success: false, error: 'Sessione scaduta. Effettua nuovamente il login.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('confirm-account-deletion', {
      body: { reason },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    });

    if (error) {
      sreLogger.error('Error confirming account deletion', { component: 'privacyService' }, error as Error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (err) {
    sreLogger.error('Exception during account deletion confirmation', { component: 'privacyService' }, err as Error);
    return { success: false, error: 'Errore durante l\'invio della richiesta' };
  }
}
