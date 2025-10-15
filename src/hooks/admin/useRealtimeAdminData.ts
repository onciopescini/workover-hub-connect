import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query-config';
import { supabase } from '@/integrations/supabase/client';
import { handleRLSError } from '@/lib/rls-error-handler';
import { toast } from 'sonner';

/**
 * Hook per dati admin in real-time con background refetch
 * Permette di avere sempre dati aggiornati senza refresh manuale
 */
export const useRealtimeAdminData = () => {
  /**
   * Pending spaces count - aggiornato ogni 30 secondi
   */
  const { data: pendingSpacesCount } = useQuery({
    queryKey: queryKeys.admin.pendingSpacesCount(),
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from('spaces')
          .select('*', { count: 'exact', head: true })
          .eq('pending_approval', true)
          .eq('published', false);
        
        if (error) throw error;
        return count || 0;
      } catch (error) {
        const rlsResult = handleRLSError(error);
        if (rlsResult.isRLSError && rlsResult.shouldShowToast) {
          toast.error('Accesso negato', { description: rlsResult.userMessage });
        }
        throw error;
      }
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: true,
  });

  /**
   * Open reports count - aggiornato ogni 30 secondi
   */
  const { data: openReportsCount } = useQuery({
    queryKey: queryKeys.admin.openReportsCount(),
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');
        
        if (error) throw error;
        return count || 0;
      } catch (error) {
        const rlsResult = handleRLSError(error);
        if (rlsResult.isRLSError && rlsResult.shouldShowToast) {
          toast.error('Accesso negato', { description: rlsResult.userMessage });
        }
        throw error;
      }
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: true,
  });

  /**
   * Unresolved support tickets count - aggiornato ogni 60 secondi
   */
  const { data: unresolvedTicketsCount } = useQuery({
    queryKey: [...queryKeys.admin.all, 'unresolved-tickets-count'],
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');
        
        if (error) throw error;
        return count || 0;
      } catch (error) {
        const rlsResult = handleRLSError(error);
        if (rlsResult.isRLSError && rlsResult.shouldShowToast) {
          toast.error('Accesso negato', { description: rlsResult.userMessage });
        }
        throw error;
      }
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });

  /**
   * Pending GDPR requests count - aggiornato ogni 60 secondi
   */
  const { data: pendingGdprCount } = useQuery({
    queryKey: [...queryKeys.admin.all, 'pending-gdpr-count'],
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from('gdpr_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        if (error) throw error;
        return count || 0;
      } catch (error) {
        const rlsResult = handleRLSError(error);
        if (rlsResult.isRLSError && rlsResult.shouldShowToast) {
          toast.error('Accesso negato', { description: rlsResult.userMessage });
        }
        throw error;
      }
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });

  return {
    pendingSpacesCount,
    openReportsCount,
    unresolvedTicketsCount,
    pendingGdprCount,
  };
};
