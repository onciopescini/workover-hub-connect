
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileText, Download, RefreshCw, Euro, Calendar, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { frontendLogger } from '@/utils/frontend-logger';
import { format } from "date-fns";

interface DAC7Report {
  id: string;
  host_id: string;
  reporting_year: number;
  total_income: number;
  total_transactions: number;
  reporting_threshold_met: boolean;
  report_generated_at?: string;
  report_file_url?: string;
  report_status?: string;
  report_json_data?: any;
  notification_sent_at?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
  user_email?: string;
}

interface CalculateDAC7ThresholdsResponse {
  total_income: number;
  total_transactions: number;
  threshold_met: boolean;
}

export const DAC7ReportsManagement = () => {
  const [reports, setReports] = useState<DAC7Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchDAC7Reports();
  }, [selectedYear]);

  const fetchDAC7Reports = async () => {
    try {
      let query = supabase
        .from('dac7_reports')
        .select('*')
        .order('total_income', { ascending: false });

      if (selectedYear !== "all") {
        query = query.eq('reporting_year', parseInt(selectedYear));
      }

      const { data: reportsData, error } = await query;

      if (error) throw error;

      // Fetch profiles and auth data separately
      const enrichedReports = await Promise.all(
        (reportsData || []).map(async (report) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', report.host_id)
            .single();

          const { data: { user } } = await supabase.auth.admin.getUserById(report.host_id);

          return {
            ...report,
            profiles: profile || undefined,
            user_email: user?.email
          } as DAC7Report;
        })
      );

      setReports(enrichedReports);
    } catch (error) {
      frontendLogger.adminAction("Error fetching DAC7 reports", error, { component: 'DAC7ReportsManagement' });
      toast.error("Errore nel caricamento dei report DAC7");
    } finally {
      setIsLoading(false);
    }
  };

  const generateReportsForYear = async (year: number, dryRun: boolean = false) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-dac7-report', {
        body: { year, dryRun }
      });

      if (error) throw error;

      toast.success(
        `Report DAC7 generati per l'anno ${year}`,
        { description: `Processati: ${data.summary.processed} host, Sopra soglia: ${data.summary.thresholdMet}` }
      );
      fetchDAC7Reports();
    } catch (error) {
      frontendLogger.adminAction("Error generating DAC7 reports", error, { component: 'DAC7ReportsManagement' });
      toast.error("Errore nella generazione dei report DAC7");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReportsToCSV = () => {
    const thresholdMetReports = reports.filter(r => r.reporting_threshold_met);
    
    if (thresholdMetReports.length === 0) {
      toast.info("Nessun host ha raggiunto le soglie DAC7 per l'anno selezionato");
      return;
    }

    const csvHeaders = [
      'Host ID',
      'Nome',
      'Email',
      'Anno',
      'Reddito Totale',
      'Transazioni',
      'Soglia Superata',
      'Status',
      'Data Generazione'
    ].join(',');

    const csvRows = thresholdMetReports.map(report => [
      report.host_id,
      `"${report.profiles?.first_name || ''} ${report.profiles?.last_name || ''}"`,
      report.user_email || '',
      report.reporting_year,
      report.total_income?.toFixed(2) || '0.00',
      report.total_transactions || 0,
      report.reporting_threshold_met ? 'Sì' : 'No',
      report.report_status || 'draft',
      report.report_generated_at ? format(new Date(report.report_generated_at), 'dd/MM/yyyy HH:mm') : 'N/A'
    ].join(','));

    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dac7_reports_${selectedYear}.csv`);
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`${thresholdMetReports.length} report esportati con successo`);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (isLoading) {
    return <div className="text-center py-8">Caricamento report DAC7...</div>;
  }

  const thresholdMetCount = reports.filter(r => r.reporting_threshold_met).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Host Totali</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Soglia DAC7 Raggiunta</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{thresholdMetCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anno Selezionato</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedYear}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Management Card */}
      <Card>
        <CardHeader>
          <CardTitle>Report DAC7 - Conformità Fiscale EU</CardTitle>
          <CardDescription>
            Monitora il reddito degli host per la conformità DAC7 (€2.000 e 25 transazioni)
          </CardDescription>
          
          <div className="flex gap-4 items-center flex-wrap">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleziona anno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli anni</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={() => generateReportsForYear(parseInt(selectedYear), false)}
              disabled={isGenerating || selectedYear === "all"}
            >
              <Play className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? "Generando..." : "Genera Report"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={exportReportsToCSV}
              disabled={thresholdMetCount === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Esporta CSV
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Host</TableHead>
                  <TableHead className="text-right">Reddito</TableHead>
                  <TableHead className="text-right">Transazioni</TableHead>
                  <TableHead className="text-center">Soglia</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nessun report DAC7 trovato per l'anno selezionato
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="font-medium">
                          {report.profiles?.first_name} {report.profiles?.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {report.user_email}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        €{report.total_income?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right">
                        {report.total_transactions || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {report.reporting_threshold_met ? (
                          <Badge variant="destructive">
                            Superata
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Sotto
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={
                            report.report_status === 'final' ? 'default' :
                            report.report_status === 'error' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {report.report_status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {report.report_file_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a 
                              href={report.report_file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
