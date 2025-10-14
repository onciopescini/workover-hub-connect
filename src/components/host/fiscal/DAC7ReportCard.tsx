import { DAC7Report } from '@/types/fiscal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FiscalStatusBadge } from '@/components/fiscal/FiscalStatusBadge';
import { Download, FileJson, FileText, CheckCircle } from 'lucide-react';
import { useDAC7Reports } from '@/hooks/fiscal/useDAC7Reports';

interface DAC7ReportCardProps {
  report: DAC7Report;
}

export const DAC7ReportCard = ({ report }: DAC7ReportCardProps) => {
  const { downloadReport, acknowledgeReport, isAcknowledging } = useDAC7Reports();

  const handleAcknowledge = async () => {
    await acknowledgeReport(report.id);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Report DAC7 {report.reporting_year}</CardTitle>
            <CardDescription>
              Generato il {new Date(report.created_at).toLocaleDateString('it-IT')}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2">
            <FiscalStatusBadge type="report-status" status={report.report_status} />
            <FiscalStatusBadge type="dac7-threshold" status={report.reporting_threshold_met} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Reddito Totale</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(report.total_income)}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Transazioni</p>
            <p className="text-2xl font-bold">{report.total_transactions}</p>
          </div>
        </div>

        {report.reporting_threshold_met && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Soglia DAC7 superata (€2.000 e 25 transazioni)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Questo report richiede dichiarazione alle autorità fiscali
            </p>
          </div>
        )}

        {report.submission_reference && (
          <div className="text-sm">
            <span className="text-muted-foreground">Riferimento invio: </span>
            <span className="font-mono">{report.submission_reference}</span>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadReport(report.id, 'json')}
          >
            <FileJson className="mr-2 h-4 w-4" />
            Scarica JSON
          </Button>

          {report.report_file_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadReport(report.id, 'pdf')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Visualizza PDF
            </Button>
          )}

          {!report.host_acknowledged_at && (
            <Button
              variant="default"
              size="sm"
              onClick={handleAcknowledge}
              disabled={isAcknowledging}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Conferma Lettura
            </Button>
          )}
        </div>

        {report.host_acknowledged_at && (
          <p className="text-xs text-muted-foreground">
            Confermato il {new Date(report.host_acknowledged_at).toLocaleDateString('it-IT')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
