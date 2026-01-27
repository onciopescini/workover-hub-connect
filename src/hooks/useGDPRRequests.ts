import { useState, useEffect, useCallback } from 'react';
import * as privacyService from '@/services/api/privacyService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/useAuth';

export const useGDPRRequests = () => {
  const { authState } = useAuth();
  const [requests, setRequests] = useState<privacyService.GDPRRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!authState.user?.id) return;

    try {
      const data = await privacyService.getGDPRRequests(authState.user.id);
      setRequests(data);
    } catch (error) {
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

    // Simulate progress phases for UX feedback
    const phases = [
      { phase: 1, message: "Raccolta dati profilo..." },
      { phase: 2, message: "Raccolta prenotazioni e messaggi..." },
      { phase: 3, message: "Raccolta file allegati..." },
      { phase: 4, message: "Generazione PDF..." },
      { phase: 5, message: "Creazione archivio ZIP..." },
      { phase: 6, message: "Finalizzazione download..." }
    ];

    try {
      // Start progress simulation
      for (let i = 0; i < phases.length - 1; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const currentPhase = phases[i];
        if (currentPhase) {
          onProgress?.(currentPhase.phase, currentPhase.message);
        }
      }

      const result = await privacyService.exportUserData(authState.user.id);
      
      if (!result.success) {
        onError?.(result.error || 'Errore sconosciuto');
        toast.error(`Errore durante l'esportazione: ${result.error}`);
        return false;
      }

      // Final phase
      const lastPhase = phases[phases.length - 1];
      if (lastPhase) {
        onProgress?.(lastPhase.phase, lastPhase.message);
      }
      
      onComplete?.(result.downloadUrl!, result.fileSize || 0);
      toast.success('Esportazione completata! Download avviato.');
      return true;

    } catch (error) {
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

    const result = await privacyService.requestDeletion(authState.user.id, reason);
    
    if (!result.success) {
      toast.error(result.error || 'Errore nell\'invio della richiesta');
      return false;
    }

    toast.success('Richiesta di cancellazione account inviata con successo');
    await fetchRequests();
    return true;
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
