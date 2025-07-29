import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/useAuth';

interface GDPRRequest {
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

export const useGDPRRequests = () => {
  const { authState } = useAuth();
  const [requests, setRequests] = useState<GDPRRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!authState.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('gdpr_requests')
        .select('*')
        .eq('user_id', authState.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type cast the response to ensure proper typing
      const typedRequests: GDPRRequest[] = (data || []).map(request => ({
        ...request,
        request_type: request.request_type as 'data_export' | 'data_deletion' | 'data_rectification',
        status: request.status as 'pending' | 'completed' | 'rejected',
        created_at: request.created_at ?? '',
        completed_at: request.completed_at ?? '',
        updated_at: request.updated_at ?? ''
      }));
      
      setRequests(typedRequests);
    } catch (error) {
      console.error('Error fetching GDPR requests:', error);
      toast.error('Errore nel caricamento delle richieste');
    } finally {
      setIsLoading(false);
    }
  }, [authState.user?.id]);

  const startInstantExport = useCallback(async (
    onProgress?: (phase: number, message: string) => void,
    onComplete?: (downloadUrl: string, fileSize: number) => void,
    onError?: (error: string) => void
  ) => {
    if (!authState.user?.id) return false;

    try {
      const { data, error } = await supabase.functions.invoke('generate-gdpr-export', {
        body: { userId: authState.user.id }
      });

      if (error) {
        throw error;
      }

      // Simulate progress for now - in production use Server-Sent Events
      const phases = [
        { phase: 1, message: "Raccolta dati profilo..." },
        { phase: 2, message: "Raccolta prenotazioni e messaggi..." },
        { phase: 3, message: "Raccolta file allegati..." },
        { phase: 4, message: "Generazione PDF..." },
        { phase: 5, message: "Creazione archivio ZIP..." },
        { phase: 6, message: "Finalizzazione download..." }
      ];

      for (let i = 0; i < phases.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        onProgress?.(phases[i]?.phase || i + 1, phases[i]?.message || 'Elaborazione...');
      }

      if (data?.downloadUrl) {
        onComplete?.(data.downloadUrl, data.fileSize || 0);
        toast.success('Esportazione completata! Download avviato.');
      } else {
        throw new Error('Nessun URL di download ricevuto');
      }

      return true;

    } catch (error) {
      console.error('Error starting instant export:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      onError?.(errorMessage);
      toast.error(`Errore durante l'esportazione: ${errorMessage}`);
      return false;
    }
  }, [authState.user?.id]);

  const submitExportRequest = useCallback(async () => {
    // Legacy method - now redirects to instant export
    toast.info('Reindirizzamento alla nuova esportazione istantanea...');
    return true;
  }, []);

  const submitDeletionRequest = useCallback(async (reason?: string) => {
    if (!authState.user?.id) return false;

    try {
      // Check if there's already a pending deletion request
      const { data: existingRequests, error: checkError } = await supabase
        .from('gdpr_requests')
        .select('id')
        .eq('user_id', authState.user.id)
        .eq('request_type', 'data_deletion')
        .eq('status', 'pending');

      if (checkError) throw checkError;

      if (existingRequests && existingRequests.length > 0) {
        toast.error('Hai già una richiesta di cancellazione in corso');
        return false;
      }

      const { error } = await supabase.rpc('request_data_deletion', {
        target_user_id: authState.user.id,
        deletion_reason: reason || 'Richiesta cancellazione account tramite Privacy Center'
      });

      if (error) throw error;

      toast.success('Richiesta di cancellazione account inviata con successo');
      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error submitting deletion request:', error);
      toast.error('Errore nell\'invio della richiesta');
      return false;
    }
  }, [authState.user?.id, fetchRequests]);

  useEffect(() => {
    fetchRequests();
  }, [authState.user?.id]);

  return {
    requests,
    isLoading,
    submitExportRequest,
    startInstantExport,
    submitDeletionRequest,
    refetch: fetchRequests
  };
};
