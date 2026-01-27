import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fiscalService from '@/services/api/fiscalService';
import { DAC7Report, DAC7ReportFilters } from '@/types/fiscal';
import { toast } from 'sonner';
import { sreLogger } from '@/lib/sre-logger';

export const useDAC7Reports = (filters?: DAC7ReportFilters) => {
  const queryClient = useQueryClient();

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['dac7-reports', filters],
    queryFn: () => fiscalService.getDAC7Reports(filters)
  });

  const getReportById = async (id: string) => {
    return fiscalService.getDAC7ReportById(id);
  };

  const acknowledgeReport = useMutation({
    mutationFn: fiscalService.acknowledgeDAC7Report,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dac7-reports'] });
      toast.success('Report DAC7 confermato');
    },
    onError: (error: Error) => {
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
    } catch (error) {
      sreLogger.error('Error downloading DAC7 report', { component: 'useDAC7Reports', reportId, format }, error as Error);
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
