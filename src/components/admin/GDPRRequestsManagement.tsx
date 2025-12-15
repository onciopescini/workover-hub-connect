
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Download, Trash2, Eye, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";

type GDPRRequestType = "data_export" | "data_deletion" | "data_rectification";
type GDPRRequestStatus = "pending" | "processing" | "completed" | "failed";

interface GDPRRequest {
  id: string;
  user_id: string;
  request_type: GDPRRequestType;
  status: GDPRRequestStatus;
  requested_at: string;
  completed_at?: string;
  notes?: string;
  export_file_url?: string;
  processed_by?: string;
  created_at: string;
  updated_at: string;
}

export const GDPRRequestsManagement = () => {
  const { error } = useLogger({ context: 'GDPRRequestsManagement' });
  const [requests, setRequests] = useState<GDPRRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedRequestType, setSelectedRequestType] = useState<string>("all");

  useEffect(() => {
    fetchGDPRRequests();

    // Realtime subscription for GDPR request updates
    const channel = supabase
      .channel('admin-gdpr-requests')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'gdpr_requests'
        },
        (payload) => {
          if (import.meta.env.DEV) {
            console.log('🔔 Realtime GDPR request update:', payload);
          }
          fetchGDPRRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGDPRRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('gdpr_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as GDPRRequest[]);
    } catch (fetchError) {
      error("Error fetching GDPR requests", fetchError as Error, { operation: 'fetch_gdpr_requests' });
      toast.error("Errore nel caricamento delle richieste GDPR");
    } finally {
      setIsLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: GDPRRequestStatus) => {
    try {
      const { error } = await supabase
        .from('gdpr_requests')
        .update({ 
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', requestId);

      if (error) throw error;
      
      toast.success("Stato richiesta aggiornato");
      fetchGDPRRequests();
    } catch (updateError) {
      error("Error updating request status", updateError as Error, { requestId, status });
      toast.error("Errore nell'aggiornamento dello stato");
    }
  };

  const getStatusBadge = (status: GDPRRequestStatus) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800"
    };

    const labels = {
      pending: "In Attesa",
      processing: "In Elaborazione",
      completed: "Completata",
      failed: "Fallita"
    };

    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getRequestTypeLabel = (type: GDPRRequestType) => {
    const labels = {
      data_export: "Esportazione Dati",
      data_deletion: "Cancellazione Dati",
      data_rectification: "Rettifica Dati"
    };
    return labels[type];
  };

  const filteredRequests = requests.filter(req => {
    const matchesStatus = selectedStatus === "all" || req.status === selectedStatus;
    const matchesRequestType = selectedRequestType === "all" || req.request_type === selectedRequestType;
    return matchesStatus && matchesRequestType;
  });

  if (isLoading) {
    return <div className="text-center py-8">Caricamento richieste GDPR...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione Richieste GDPR</CardTitle>
        <CardDescription>
          Monitora e gestisci le richieste di privacy degli utenti
        </CardDescription>
        
        <div className="flex gap-4 items-center">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtra per stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="pending">In Attesa</SelectItem>
              <SelectItem value="processing">In Elaborazione</SelectItem>
              <SelectItem value="completed">Completate</SelectItem>
              <SelectItem value="failed">Fallite</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedRequestType} onValueChange={setSelectedRequestType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtra per tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              <SelectItem value="data_export">Esportazione Dati</SelectItem>
              <SelectItem value="data_deletion">Cancellazione Dati</SelectItem>
              <SelectItem value="data_rectification">Rettifica Dati</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utente</TableHead>
                <TableHead>Tipo Richiesta</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Data Richiesta</TableHead>
                <TableHead>Data Completamento</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Nessuna richiesta GDPR trovata
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.user_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {getRequestTypeLabel(request.request_type)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(request.requested_at).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell>
                      {request.completed_at 
                        ? new Date(request.completed_at).toLocaleDateString('it-IT')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {request.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateRequestStatus(request.id, 'processing')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => updateRequestStatus(request.id, 'completed')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => updateRequestStatus(request.id, 'failed')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        {request.request_type === 'data_export' && request.export_file_url && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(request.export_file_url, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
