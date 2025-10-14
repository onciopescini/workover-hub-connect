import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DAC7Report, DAC7ReportFilters } from '@/types/fiscal';
import { toast } from 'sonner';
import { sreLogger } from '@/lib/sre-logger';

export const useDAC7Reports = (filters?: DAC7ReportFilters) => {
  const queryClient = useQueryClient();

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['dac7-reports', filters],
    queryFn: async () => {
      let query = supabase
        .from('dac7_reports')
        .select('*')
        .order('reporting_year', { ascending: false });

      if (filters?.year) {
        query = query.eq('reporting_year', filters.year);
      }

      if (filters?.status) {
        query = query.eq('report_status', filters.status);
      }

      if (filters?.hostId) {
        query = query.eq('host_id', filters.hostId);
      }

      if (filters?.thresholdMet !== undefined) {
        query = query.eq('reporting_threshold_met', filters.thresholdMet);
      }

      const { data, error } = await query;

      if (error) {
        sreLogger.error('Error fetching DAC7 reports', { error, filters });
        throw error;
      }

      return data as DAC7Report[];
    }
  });

  const getReportById = async (id: string) => {
    const { data, error } = await supabase
      .from('dac7_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      sreLogger.error('Error fetching DAC7 report by ID', { error, id });
      throw error;
    }

    return data as DAC7Report;
  };

  const acknowledgeReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('dac7_reports')
        .update({ host_acknowledged_at: new Date().toISOString() })
        .eq('id', reportId)
        .eq('host_id', user.id)
        .select()
        .single();

      if (error) {
        sreLogger.error('Error acknowledging DAC7 report', { error, reportId });
        throw error;
      }

      return data as DAC7Report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dac7-reports'] });
      toast.success('Report DAC7 confermato');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore nella conferma del report');
    }
  });

  const downloadReport = async (reportId: string, format: 'json' | 'pdf' = 'json') => {
    try {
      const report = await getReportById(reportId);

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(report.report_json_data, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DAC7_Report_${report.reporting_year}_${report.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Report JSON scaricato');
      } else if (format === 'pdf' && report.report_file_url) {
        window.open(report.report_file_url, '_blank');
        toast.success('Report PDF aperto');
      } else {
        toast.error('Formato report non disponibile');
      }
    } catch (error: any) {
      sreLogger.error('Error downloading DAC7 report', { error, reportId, format });
      toast.error('Errore nel download del report');
    }
  };

  return {
    reports,
    isLoading,
    error,
    getReportById,
    acknowledgeReport: acknowledgeReport.mutateAsync,
    downloadReport,
    isAcknowledging: acknowledgeReport.isPending
  };
};
