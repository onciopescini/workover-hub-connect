
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Eye, Edit3, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";

interface GDPRRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: string;
  notes?: string;
  requested_at: string;
  completed_at?: string;
  processed_by?: string;
}

export const DataRectificationManagement = () => {
  const { error } = useLogger({ context: 'DataRectificationManagement' });
  const [requests, setRequests] = useState<GDPRRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<GDPRRequest | null>(null);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [correctionsApplied, setCorrectionsApplied] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('gdpr_requests')
        .select('*')
        .eq('request_type', 'data_rectification')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as GDPRRequest[]);
    } catch (fetchError) {
      error("Error fetching rectification requests", fetchError as Error, { operation: 'fetch_rectification_requests' });
      toast.error("Errore nel caricamento delle richieste");
    } finally {
      setIsLoading(false);
    }
  };

  const processRequest = async (approved: boolean) => {
    if (!selectedRequest) return;

    try {
      let correctionsData = {};
      if (approved && correctionsApplied) {
        try {
          correctionsData = JSON.parse(correctionsApplied);
        } catch (e) {
          toast.error("Formato JSON non valido per le correzioni applicate");
          return;
        }
      }

      const { data, error } = await supabase.rpc('process_data_rectification', {
        request_id: selectedRequest.id,
        approved,
        admin_notes: adminNotes,
        corrections_applied: correctionsData
      } as unknown as any);

      if (error) throw error;

      const result = data as unknown as { success: boolean; error?: string; message: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to process request');
      }

      toast.success(result.message);
      setIsProcessDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes("");
      setCorrectionsApplied("");
      fetchRequests();
    } catch (processError) {
      error("Error processing request", processError as Error, { 
        requestId: selectedRequest?.id,
        approved,
        operation: 'process_rectification'
      });
      toast.error("Errore nell'elaborazione della richiesta");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800"
    };

    const labels = {
      pending: "In Attesa",
      processing: "In Elaborazione",
      completed: "Completata",
      rejected: "Rifiutata"
    };

    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const filteredRequests = selectedStatus === "all" 
    ? requests 
    : requests.filter(req => req.status === selectedStatus);

  if (isLoading) {
    return <div className="text-center py-8">Caricamento richieste di rettifica...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Richieste Totali</CardTitle>
            <Edit3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Attesa</CardTitle>
            <Eye className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {requests.filter(r => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {requests.filter(r => r.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rifiutate</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {requests.filter(r => r.status === 'rejected').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Management */}
      <Card>
        <CardHeader>
          <CardTitle>Gestione Richieste Rettifica Dati</CardTitle>
          <CardDescription>
            Gestisci le richieste di rettifica dati secondo GDPR Articolo 16
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
                <SelectItem value="rejected">Rifiutate</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={fetchRequests}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Aggiorna
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utente</TableHead>
                  <TableHead>Dettagli Richiesta</TableHead>
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
                      Nessuna richiesta di rettifica trovata
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <div className="truncate" title={request.notes || ""}>
                          {request.notes || "Nessun dettaglio fornito"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(request.requested_at).toLocaleDateString('it-IT', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {request.completed_at 
                          ? new Date(request.completed_at).toLocaleDateString('it-IT', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsProcessDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Elabora
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

      {/* Process Request Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Elabora Richiesta Rettifica</DialogTitle>
            <DialogDescription>
              Rivedi la richiesta e decidi se approvarla o rifiutarla
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Dettagli Richiesta:</Label>
                <div className="p-3 bg-gray-50 rounded-md text-sm whitespace-pre-wrap">
                  {selectedRequest.notes || "Nessun dettaglio fornito"}
                </div>
              </div>
              
              <div>
                <Label htmlFor="admin_notes">Note Admin</Label>
                <Textarea
                  id="admin_notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Aggiungi note sull'elaborazione della richiesta..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="corrections">Correzioni Applicate (JSON - solo se approvata)</Label>
                <Textarea
                  id="corrections"
                  value={correctionsApplied}
                  onChange={(e) => setCorrectionsApplied(e.target.value)}
                  placeholder='{"field": "first_name", "old_value": "Mario", "new_value": "Marco"}'
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato JSON opzionale per documentare le correzioni specifiche applicate
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => processRequest(false)}
              className="bg-red-600 hover:bg-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rifiuta
            </Button>
            <Button onClick={() => processRequest(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
