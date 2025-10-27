import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFiscalDashboard } from "@/hooks/fiscal/useFiscalDashboard";
import { useDAC7Reports } from "@/hooks/fiscal/useDAC7Reports";
import { DAC7ReportsTable } from "./DAC7ReportsTable";
import { AdminFiscalReconciliation } from "./AdminFiscalReconciliation";
import { FiscalStatusBadge } from "@/components/fiscal/FiscalStatusBadge";
import { Euro, FileText, TrendingUp, Users, Download, FileSpreadsheet } from "lucide-react";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { toast as sonnerToast } from "sonner";

export const FiscalManagementContainer = () => {
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);
  const [isGenerating, setIsGenerating] = useState(false);
  const { fiscalStats, isLoadingStats } = useFiscalDashboard();
  const { reports, isLoading: isLoadingReports } = useDAC7Reports({ year: activeYear });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  const handleGenerateDAC7Report = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-dac7-report', {
        body: { year: selectedYear }
      });

      if (error) throw error;

      toast({
        title: "✅ Report DAC7 Generato",
        description: `Report per l'anno ${selectedYear} generato con successo. ${data?.summary?.reports_created || 0} report creati.`,
      });

      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ['dac7-reports'] });
      await queryClient.invalidateQueries({ queryKey: ['fiscal-dashboard'] });
    } catch (error: any) {
      toast({
        title: "❌ Errore Generazione Report",
        description: error.message || "Si è verificato un errore durante la generazione del report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = () => {
    try {
      if (!reports || reports.length === 0) {
        sonnerToast.error('Nessun report da esportare');
        return;
      }

      // Prepare CSV data - handle undefined values
      const csvData = reports.map(r => ({
        'Host ID': r.host_id || '',
        'Anno': r.reporting_year || '',
        'Reddito Totale (€)': r.total_income || 0,
        'Transazioni': r.total_transactions || 0,
        'Soglia Superata': r.reporting_threshold_met ? 'Sì' : 'No',
        'Stato Report': r.report_status || '',
        'Reference': r.submission_reference || '-'
      }));

      // Convert to CSV
      const headers = Object.keys(csvData[0] || {});
      const csvRows = [
        headers.join(','),
        ...csvData.filter(Boolean).map(row =>
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
          }).join(',')
        )
      ];
      
      const csv = csvRows.join('\n');
      
      // Create blob and download
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dac7_reports_${activeYear}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      sonnerToast.success('Export CSV completato');
    } catch (error) {
      console.error('Export CSV error:', error);
      sonnerToast.error('Errore durante l\'export CSV');
    }
  };

  const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (isLoadingStats) {
    return <LoadingSkeleton variant="admin" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Gestione Fiscale</h2>
        <p className="text-muted-foreground">
          Gestisci i report DAC7 e monitora lo stato fiscale degli host
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Report Totali</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fiscalStats?.totalReports || 0}</div>
            <p className="text-xs text-muted-foreground">Anno corrente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sopra Soglia</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fiscalStats?.reportsAboveThreshold || 0}</div>
            <p className="text-xs text-muted-foreground">Report da inviare</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reddito Totale</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(fiscalStats?.totalIncome || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Anno corrente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Host Attivi</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fiscalStats?.hostCount || 0}</div>
            <p className="text-xs text-muted-foreground">Con transazioni</p>
          </CardContent>
        </Card>
      </div>

      {/* Manual DAC7 Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Generazione Manuale Report DAC7
          </CardTitle>
          <CardDescription>
            Genera i report DAC7 per un anno specifico. Questa operazione calcola automaticamente i dati fiscali per tutti gli host che superano le soglie.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-4">
          <div className="flex-1 max-w-xs space-y-2">
            <label className="text-sm font-medium">Anno Fiscale</label>
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleGenerateDAC7Report}
            disabled={isGenerating}
            className="min-w-[200px]"
          >
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generazione...' : 'Genera Report'}
          </Button>
        </CardContent>
      </Card>

      {/* Export CSV Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline"
          onClick={handleExportCSV}
          disabled={!reports || reports.length === 0}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Esporta CSV
        </Button>
      </div>

      {/* Reports Table */}
      <Tabs defaultValue="reconciliation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reconciliation">Riconciliazione</TabsTrigger>
          <TabsTrigger value="all">Report DAC7</TabsTrigger>
          <TabsTrigger value="threshold">Sopra Soglia</TabsTrigger>
          <TabsTrigger value="submitted">Inviati</TabsTrigger>
        </TabsList>

        <TabsContent value="reconciliation" className="space-y-4">
          <AdminFiscalReconciliation />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <DAC7ReportsTable reports={reports || []} isLoading={isLoadingReports} />
        </TabsContent>

        <TabsContent value="threshold" className="space-y-4">
          <DAC7ReportsTable 
            reports={reports?.filter(r => r.reporting_threshold_met) || []} 
            isLoading={isLoadingReports} 
          />
        </TabsContent>

        <TabsContent value="submitted" className="space-y-4">
          <DAC7ReportsTable 
            reports={reports?.filter(r => r.report_status === 'submitted') || []} 
            isLoading={isLoadingReports} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
