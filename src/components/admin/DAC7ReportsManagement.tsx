
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, RefreshCw, Euro, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DAC7Report {
  id: string;
  host_id: string;
  reporting_year: number;
  total_income: number;
  total_transactions: number;
  reporting_threshold_met: boolean;
  report_generated_at?: string;
  report_file_url?: string;
  created_at: string;
  updated_at: string;
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
        .order('created_at', { ascending: false });

      if (selectedYear !== "all") {
        query = query.eq('reporting_year', parseInt(selectedYear));
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports((data || []) as DAC7Report[]);
    } catch (error) {
      console.error("Error fetching DAC7 reports:", error);
      toast.error("Errore nel caricamento dei report DAC7");
    } finally {
      setIsLoading(false);
    }
  };

  const generateReportsForYear = async (year: number) => {
    setIsGenerating(true);
    try {
      // Get all hosts
      const { data: hosts, error: hostsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'host');

      if (hostsError) throw hostsError;

      // Generate reports for each host
      for (const host of hosts || []) {
        await supabase.rpc('calculate_dac7_thresholds', {
          host_id_param: host.id,
          year_param: year
        });
      }

      toast.success(`Report DAC7 generati per l'anno ${year}`);
      fetchDAC7Reports();
    } catch (error) {
      console.error("Error generating DAC7 reports:", error);
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

    const csvContent = [
      ['Host ID', 'Anno', 'Reddito Totale (EUR)', 'Transazioni Totali', 'Soglia Raggiunta'],
      ...thresholdMetReports.map(report => [
        report.host_id,
        report.reporting_year.toString(),
        report.total_income.toFixed(2),
        report.total_transactions.toString(),
        report.reporting_threshold_met ? 'Sì' : 'No'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dac7-report-${selectedYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Report DAC7 esportato con successo");
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
              onClick={() => generateReportsForYear(parseInt(selectedYear))}
              disabled={isGenerating || selectedYear === "all"}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
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
                  <TableHead>Host ID</TableHead>
                  <TableHead>Anno</TableHead>
                  <TableHead>Reddito Totale</TableHead>
                  <TableHead>Transazioni</TableHead>
                  <TableHead>Soglia DAC7</TableHead>
                  <TableHead>Ultimo Aggiornamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nessun report DAC7 trovato per l'anno selezionato
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-mono text-sm">
                        {report.host_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{report.reporting_year}</TableCell>
                      <TableCell>
                        <span className="font-medium">
                          €{report.total_income.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {report.total_transactions}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={report.reporting_threshold_met ? "destructive" : "secondary"}
                        >
                          {report.reporting_threshold_met ? "Soglia Raggiunta" : "Sotto Soglia"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(report.created_at).toLocaleDateString('it-IT')}
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
