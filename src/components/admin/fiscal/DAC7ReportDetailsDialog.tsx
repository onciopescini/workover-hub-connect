import { DAC7Report } from "@/types/fiscal";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FiscalStatusBadge } from "@/components/fiscal/FiscalStatusBadge";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileText } from "lucide-react";
import { useDAC7Reports } from "@/hooks/fiscal/useDAC7Reports";
import { Separator } from "@/components/ui/separator";

interface DAC7ReportDetailsDialogProps {
  report: DAC7Report;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DAC7ReportDetailsDialog = ({ 
  report, 
  open, 
  onOpenChange 
}: DAC7ReportDetailsDialogProps) => {
  const { downloadReport } = useDAC7Reports();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dettagli Report DAC7 - Anno {report.reporting_year}</DialogTitle>
          <DialogDescription>
            Report ID: {report.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Section */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Stato Report</h4>
            <div className="flex gap-2 flex-wrap">
              <FiscalStatusBadge type="report-status" status={report.report_status} />
              <FiscalStatusBadge type="dac7-threshold" status={report.reporting_threshold_met} />
            </div>
          </div>

          <Separator />

          {/* Financial Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Dati Finanziari</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reddito Totale:</span>
                  <span className="font-medium">{formatCurrency(report.total_income)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transazioni:</span>
                  <span className="font-medium">{report.total_transactions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Soglia Raggiunta:</span>
                  <span className="font-medium">
                    {report.reporting_threshold_met ? 'Sì' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Host</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <div className="font-mono text-xs mt-1 break-all">
                    {report.host_id}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Timeline</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creato:</span>
                <span>{formatDate(report.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ultimo Aggiornamento:</span>
                <span>{formatDate(report.updated_at)}</span>
              </div>
              {report.notification_sent_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notifica Inviata:</span>
                  <span>{formatDate(report.notification_sent_at)}</span>
                </div>
              )}
              {report.host_acknowledged_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Presa Visione Host:</span>
                  <span>{formatDate(report.host_acknowledged_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Submission Details */}
          {report.submission_reference && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Dettagli Invio</h4>
                <div className="text-sm space-y-2">
                  <div>
                    <span className="text-muted-foreground">Riferimento:</span>
                    <div className="font-mono text-xs mt-1">{report.submission_reference}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Error Details */}
          {report.error_details && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2 text-destructive">Errori</h4>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                  {JSON.stringify(report.error_details, null, 2)}
                </pre>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => downloadReport(report.id, 'json')}
              className="flex-1"
            >
              <FileJson className="w-4 h-4 mr-2" />
              Scarica JSON
            </Button>
            {report.report_file_url && (
              <Button
                variant="outline"
                onClick={() => downloadReport(report.id, 'pdf')}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Scarica PDF
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
