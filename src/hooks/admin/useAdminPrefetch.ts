import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query-config';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';
import { handleRLSError } from '@/lib/rls-error-handler';
import { toast } from 'sonner';

/**
 * Hook per prefetching intelligente dei dati admin
 * Utilizzato per caricare i dati in anticipo (hover o idle time)
 */
export const useAdminPrefetch = () => {
  const queryClient = useQueryClient();

  /**
   * Prefetch lista utenti
   */
  const prefetchUsers = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.admin.users(),
      queryFn: async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (error) throw error;
          return data;
        } catch (error) {
          const rlsResult = handleRLSError(error);
          if (rlsResult.isRLSError && rlsResult.shouldShowToast) {
            toast.error('Accesso negato', { description: rlsResult.userMessage });
          }
          throw error;
        }
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  /**
   * Prefetch lista spazi pending approval
   */
  const prefetchSpaces = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.admin.spaces({ pending_approval: true }),
      queryFn: async () => {
        try {
          const { data, error } = await supabase
            .from('spaces')
            .select(`
              *,
              profiles:host_id (
                id,
                first_name,
                last_name
              )
            `)
            .eq('pending_approval', true)
            .eq('published', false)
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (error) throw error;
          return data;
        } catch (error) {
          const rlsResult = handleRLSError(error);
          if (rlsResult.isRLSError && rlsResult.shouldShowToast) {
            toast.error('Accesso negato', { description: rlsResult.userMessage });
          }
          throw error;
        }
      },
      staleTime: 2 * 60 * 1000,
    });
  }, [queryClient]);

  /**
   * Prefetch reports aperti
   */
  const prefetchReports = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.admin.reports({ status: 'open' }),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('reports')
          .select(`
            *,
            reporter:reporter_id (
              id,
              first_name,
              last_name
            )
          `)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        return data;
      },
      staleTime: 2 * 60 * 1000,
    });
  }, [queryClient]);

  /**
   * Prefetch system settings
   */
  const prefetchSettings = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.admin.settings(),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .order('category', { ascending: true });
        
        if (error) throw error;
        return data;
      },
      staleTime: 10 * 60 * 1000, // 10 minuti (settings cambiano raramente)
    });
  }, [queryClient]);

  /**
   * Prefetch activity log
   */
  const prefetchActivityLog = useCallback((limit: number = 20) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.admin.activityLog(limit),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('admin_actions_log')
          .select(`
            *,
            admin:admin_id (
              id,
              first_name,
              last_name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        return data;
      },
      staleTime: 1 * 60 * 1000, // 1 minuto
    });
  }, [queryClient]);

  return {
    prefetchUsers,
    prefetchSpaces,
    prefetchReports,
    prefetchSettings,
    prefetchActivityLog,
  };
};
