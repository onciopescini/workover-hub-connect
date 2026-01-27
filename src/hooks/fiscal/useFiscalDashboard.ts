import { useQuery } from '@tanstack/react-query';
import * as fiscalService from '@/services/api/fiscalService';
import { supabase } from '@/integrations/supabase/client';
import { FiscalStats, HostInvoice } from '@/types/fiscal';

export const useFiscalDashboard = () => {
  const getFiscalStats = useQuery({
    queryKey: ['fiscal-stats'],
    queryFn: () => fiscalService.getFiscalStats()
  });

  const getThresholdStatus = (hostId?: string, year?: number) => {
    return useQuery({
      queryKey: ['threshold-status', hostId, year],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const targetHostId = hostId || user?.id;
        const targetYear = year || new Date().getFullYear();

        if (!targetHostId) {
          throw new Error('Host ID required');
        }

        return fiscalService.calculateDAC7Thresholds(targetHostId, targetYear);
      },
      enabled: !!hostId || !!supabase.auth.getUser()
    });
  };

  const getHostInvoiceHistory = (hostId?: string) => {
    return useQuery({
      queryKey: ['host-invoice-history', hostId],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const targetHostId = hostId || user?.id;

        if (!targetHostId) {
          throw new Error('Host ID required');
        }

        return fiscalService.getHostInvoices(targetHostId);
      },
      enabled: !!hostId || !!supabase.auth.getUser()
    });
  };

  return {
    fiscalStats: getFiscalStats.data,
    isLoadingStats: getFiscalStats.isLoading,
    statsError: getFiscalStats.error,
    getThresholdStatus,
    getHostInvoiceHistory
  };
};
