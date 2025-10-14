import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FiscalStats, HostInvoice } from '@/types/fiscal';
import { sreLogger } from '@/lib/sre-logger';

export const useFiscalDashboard = () => {
  const getFiscalStats = useQuery({
    queryKey: ['fiscal-stats'],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      const { data: reports, error } = await supabase
        .from('dac7_reports')
        .select('*')
        .eq('reporting_year', currentYear);

      if (error) {
        sreLogger.error('Error fetching fiscal stats', { error });
        throw error;
      }

      const stats: FiscalStats = {
        totalReports: reports.length,
        reportsAboveThreshold: reports.filter(r => r.reporting_threshold_met).length,
        totalIncome: reports.reduce((sum, r) => sum + (r.total_income || 0), 0),
        averageIncome: reports.length > 0 
          ? reports.reduce((sum, r) => sum + (r.total_income || 0), 0) / reports.length 
          : 0,
        hostCount: new Set(reports.map(r => r.host_id)).size
      };

      return stats;
    }
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

        const { data, error } = await supabase.rpc('calculate_dac7_thresholds', {
          host_id_param: targetHostId,
          year_param: targetYear
        });

        if (error) {
          sreLogger.error('Error fetching threshold status', { error, hostId: targetHostId, year: targetYear });
          throw error;
        }

        return data as {
          total_income: number;
          total_transactions: number;
          threshold_met: boolean;
        };
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

        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('recipient_id', targetHostId)
          .eq('recipient_type', 'host')
          .order('invoice_date', { ascending: false });

        if (error) {
          sreLogger.error('Error fetching host invoice history', { error, hostId: targetHostId });
          throw error;
        }

        return data as HostInvoice[];
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
