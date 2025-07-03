import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  Shield, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Filter,
  FileText
} from "lucide-react";
import { ReportDetailsDialog } from "./ReportDetailsDialog";

interface Report {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  reporter_id: string;
  admin_notes?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reporter: {
    first_name: string;
    last_name: string;
  };
}

export function ReportsList() {
  const { authState } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          reporter:reporter_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setReports((data || []).map(report => ({
        ...report,
        description: report.description || '',
        status: report.status || 'open',
        created_at: report.created_at || new Date().toISOString(),
        admin_notes: report.admin_notes || '',
        reviewed_at: report.reviewed_at || '',
        reviewed_by: report.reviewed_by || ''
      })));
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Errore nel caricamento delle segnalazioni');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive"><Clock className="w-3 h-3 mr-1" />Aperta</Badge>;
      case 'under_review':
        return <Badge variant="secondary"><Eye className="w-3 h-3 mr-1" />In revisione</Badge>;
      case 'resolved':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Risolta</Badge>;
      case 'dismissed':
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Respinta</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTargetTypeLabel = (type: string) => {
    switch (type) {
      case 'user':
        return 'Utente';
      case 'space':
        return 'Spazio';
      case 'event':
        return 'Evento';
      case 'booking':
        return 'Prenotazione';
      default:
        return type;
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'inappropriate_content':
        return 'Contenuto inappropriato';
      case 'spam':
        return 'Spam';
      case 'harassment':
        return 'Molestie';
      case 'fake_profile':
        return 'Profilo falso';
      case 'safety_concern':
        return 'Problema di sicurezza';
      case 'other':
        return 'Altro';
      default:
        return reason;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-500" />
          <h2 className="text-2xl font-bold">Segnalazioni</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtra per stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="open">Aperte</SelectItem>
              <SelectItem value="under_review">In revisione</SelectItem>
              <SelectItem value="resolved">Risolte</SelectItem>
              <SelectItem value="dismissed">Respinte</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessuna segnalazione
            </h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'Non ci sono segnalazioni al momento.'
                : `Non ci sono segnalazioni con stato "${filter}".`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getTargetTypeLabel(report.target_type)}
                        </Badge>
                        <span className="text-sm font-medium">
                          {getReasonLabel(report.reason)}
                        </span>
                      </div>
                      {getStatusBadge(report.status)}
                    </div>

                    <p className="text-gray-700 mb-3 line-clamp-2">
                      {report.description || 'Nessuna descrizione fornita'}
                    </p>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        Segnalato da: {report.reporter?.first_name} {report.reporter?.last_name}
                      </span>
                      <span>
                        {new Date(report.created_at).toLocaleDateString('it-IT')}
                      </span>
                    </div>

                    {report.admin_notes && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Note admin:</strong> {report.admin_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReport(report)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Dettagli
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedReport && (
        <ReportDetailsDialog
          report={selectedReport}
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          onUpdate={fetchReports}
        />
      )}
    </div>
  );
}
