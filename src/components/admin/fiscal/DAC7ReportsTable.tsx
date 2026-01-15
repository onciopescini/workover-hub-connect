import { useState } from 'react';
import { DAC7Report } from "@/types/fiscal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FiscalStatusBadge } from "@/components/fiscal/FiscalStatusBadge";
import { Eye, Download } from "lucide-react";
import { DAC7ReportDetailsDialog } from "./DAC7ReportDetailsDialog";
import { useDAC7Reports } from "@/hooks/fiscal/useDAC7Reports";
import { Skeleton } from "@/components/ui/skeleton";

interface DAC7ReportsTableProps {
  reports: DAC7Report[];
  isLoading: boolean;
}

export const DAC7ReportsTable = ({ reports, isLoading }: DAC7ReportsTableProps) => {
  const [selectedReport, setSelectedReport] = useState<DAC7Report | null>(null);
  const { downloadReport } = useDAC7Reports();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nessun report disponibile per questo filtro
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Anno</TableHead>
              <TableHead>Host ID</TableHead>
              <TableHead>Reddito Totale</TableHead>
              <TableHead>Transazioni</TableHead>
              <TableHead>Soglia</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Data Creazione</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-medium">{report.reporting_year}</TableCell>
                <TableCell className="font-mono text-xs">
                  {report.host_id.substring(0, 8)}...
                </TableCell>
                <TableCell>{formatCurrency(report.total_income)}</TableCell>
                <TableCell>{report.total_transactions}</TableCell>
                <TableCell>
                  <FiscalStatusBadge 
                    type="dac7-threshold" 
                    status={report.reporting_threshold_met} 
                  />
                </TableCell>
                <TableCell>
                  <FiscalStatusBadge 
                    type="report-status" 
                    status={report.report_status} 
                  />
                </TableCell>
                <TableCell>{formatDate(report.created_at)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedReport(report)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadReport(report.id, 'json')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedReport && (
        <DAC7ReportDetailsDialog
          report={selectedReport}
          open={!!selectedReport}
          onOpenChange={(open) => !open && setSelectedReport(null)}
        />
      )}
    </>
  );
};
