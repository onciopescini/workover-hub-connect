import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  FileText, 
  ExternalLink, 
  Building2, 
  Calendar, 
  AlertCircle,
  Search
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import LoadingScreen from '@/components/LoadingScreen';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface KYCHost {
  host_id: string;
  first_name: string;
  last_name: string;
  email: string;
  kyc_verified: boolean | null;
  kyc_rejection_reason: string | null;
  stripe_connected: boolean;
  created_at: string;
  kyc_documents_count: number;
  tax_details_count: number;
  active_spaces_count: number;
  total_bookings_count: number;
}

export const AdminKYC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHost, setSelectedHost] = useState<KYCHost | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch hosts with KYC data
  const { data: hosts, isLoading, error, refetch } = useQuery({
    queryKey: ['admin_kyc_hosts', statusFilter],
    queryFn: async () => {
      // Map status filter to kyc_verified value
      let kycStatusParam: string | null = null;
      if (statusFilter === 'pending') kycStatusParam = 'pending';
      else if (statusFilter === 'approved') kycStatusParam = 'approved';
      else if (statusFilter === 'rejected') kycStatusParam = 'rejected';
      
      const { data, error } = await supabase.rpc('get_admin_kyc_hosts' as any, {
        kyc_status_param: kycStatusParam
      });
      
      if (error) throw error;
      return (data || []) as KYCHost[];
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (hostId: string) => {
      const { data, error } = await supabase.functions.invoke('approve-kyc', {
        body: { host_id: hostId, approved: true }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('KYC Approvato con successo');
      queryClient.invalidateQueries({ queryKey: ['admin_kyc_hosts'] });
      setShowApproveConfirm(false);
      setSelectedHost(null);
    },
    onError: (error) => {
      toast.error(`Errore: ${error.message}`);
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ hostId, reason }: { hostId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('approve-kyc', {
        body: { host_id: hostId, approved: false, rejection_reason: reason }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('KYC Rifiutato - Notifica inviata all\'host');
      queryClient.invalidateQueries({ queryKey: ['admin_kyc_hosts'] });
      setShowRejectDialog(false);
      setSelectedHost(null);
      setRejectionReason('');
    },
    onError: (error) => {
      toast.error(`Errore: ${error.message}`);
    }
  });

  // View KYC documents
  const viewDocuments = async (hostId: string) => {
    try {
      // List files in the host's KYC folder
      const { data: files, error } = await supabase.storage
        .from('kyc-documents')
        .list(hostId, { limit: 100 });

      if (error) throw error;

      if (!files || files.length === 0) {
        toast.info('Nessun documento KYC trovato');
        return;
      }

      // Create signed URLs for each file
      for (const file of files) {
        const { data: signedUrl } = await supabase.storage
          .from('kyc-documents')
          .createSignedUrl(`${hostId}/${file.name}`, 3600);
        
        if (signedUrl?.signedUrl) {
          window.open(signedUrl.signedUrl, '_blank');
        }
      }
    } catch (error) {
      toast.error('Errore nel caricamento dei documenti');
      console.error('Error fetching KYC documents:', error);
    }
  };

  const getKycStatusBadge = (host: KYCHost) => {
    if (host.kyc_verified === true) {
      return <Badge className="bg-green-100 text-green-800">Verificato</Badge>;
    } else if (host.kyc_verified === false) {
      return <Badge className="bg-red-100 text-red-800">Rifiutato</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">In attesa</Badge>;
    }
  };

  const filteredHosts = hosts?.filter(host => {
    const searchLower = searchTerm.toLowerCase();
    return (
      host.first_name?.toLowerCase().includes(searchLower) ||
      host.last_name?.toLowerCase().includes(searchLower) ||
      host.email?.toLowerCase().includes(searchLower)
    );
  }) || [];

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <h3 className="text-lg font-bold mb-2">Errore nel caricamento</h3>
        <p className="text-sm">{String(error)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Verifica KYC
          </h1>
          <p className="text-gray-500 mt-1">Gestisci le richieste di verifica degli Host.</p>
        </div>
      </header>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Cerca per nome o email..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
                data-testid="kyc-status-filter"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="pending">In attesa</SelectItem>
                  <SelectItem value="approved">Approvati</SelectItem>
                  <SelectItem value="rejected">Rifiutati</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KYC Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredHosts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Nessuna richiesta KYC trovata.</p>
            </CardContent>
          </Card>
        ) : (
          filteredHosts.map((host) => (
            <Card 
              key={host.host_id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              data-testid={`kyc-card-${host.email}`}
              data-kyc-status={host.kyc_verified === true ? 'approved' : host.kyc_verified === false ? 'rejected' : 'pending'}
              onClick={() => {
                setSelectedHost(host);
                setShowDetailsDialog(true);
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {host.first_name?.[0]}{host.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {host.first_name} {host.last_name}
                      </CardTitle>
                      <p className="text-sm text-gray-500">{host.email}</p>
                    </div>
                  </div>
                  {getKycStatusBadge(host)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="h-4 w-4" />
                    <span>{host.kyc_documents_count} documenti</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="h-4 w-4" />
                    <span>{host.active_spaces_count} spazi</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{host.total_bookings_count} prenotazioni</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {host.stripe_connected ? (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        Stripe OK
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        No Stripe
                      </Badge>
                    )}
                  </div>
                </div>

                {host.kyc_rejection_reason && (
                  <div className="p-2 bg-red-50 rounded text-sm text-red-700">
                    <strong>Motivo rifiuto:</strong> {host.kyc_rejection_reason}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => viewDocuments(host.host_id)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Documenti
                  </Button>
                  {host.kyc_verified !== true && (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedHost(host);
                          setShowApproveConfirm(true);
                        }}
                        data-testid="approve-kyc"
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approva
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedHost(host);
                          setShowRejectDialog(true);
                        }}
                        data-testid="reject-kyc"
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rifiuta
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg" data-testid="kyc-details-dialog">
          <DialogHeader>
            <DialogTitle>Dettagli KYC</DialogTitle>
            <DialogDescription>
              Informazioni complete dell'host
            </DialogDescription>
          </DialogHeader>
          {selectedHost && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
                    {selectedHost.first_name?.[0]}{selectedHost.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedHost.first_name} {selectedHost.last_name}
                  </h3>
                  <p className="text-gray-500">{selectedHost.email}</p>
                  {getKycStatusBadge(selectedHost)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Iscrizione</span>
                  <p className="font-medium">
                    {format(new Date(selectedHost.created_at), 'dd MMM yyyy', { locale: it })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Stripe</span>
                  <p className="font-medium">
                    {selectedHost.stripe_connected ? '✅ Collegato' : '❌ Non collegato'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Documenti KYC</span>
                  <p className="font-medium">{selectedHost.kyc_documents_count}</p>
                </div>
                <div>
                  <span className="text-gray-500">Dati Fiscali</span>
                  <p className="font-medium">{selectedHost.tax_details_count}</p>
                </div>
                <div>
                  <span className="text-gray-500">Spazi Attivi</span>
                  <p className="font-medium">{selectedHost.active_spaces_count}</p>
                </div>
                <div>
                  <span className="text-gray-500">Prenotazioni Totali</span>
                  <p className="font-medium">{selectedHost.total_bookings_count}</p>
                </div>
              </div>

              {selectedHost.kyc_rejection_reason && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-red-800">Motivo Rifiuto:</span>
                  <p className="text-red-700">{selectedHost.kyc_rejection_reason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Chiudi
            </Button>
            <Button onClick={() => selectedHost && viewDocuments(selectedHost.host_id)}>
              <FileText className="h-4 w-4 mr-2" />
              Visualizza Documenti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation */}
      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent data-testid="confirm-approval">
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Approvazione KYC</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per approvare la verifica KYC per{' '}
              <strong>{selectedHost?.first_name} {selectedHost?.last_name}</strong>.
              L'host potrà pubblicare i suoi spazi sulla piattaforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedHost && approveMutation.mutate(selectedHost.host_id)}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Approvazione...' : 'Conferma Approvazione'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent data-testid="confirm-rejection">
          <DialogHeader>
            <DialogTitle>Rifiuta Verifica KYC</DialogTitle>
            <DialogDescription>
              Specifica il motivo del rifiuto per{' '}
              <strong>{selectedHost?.first_name} {selectedHost?.last_name}</strong>.
              L'host riceverà una notifica con le istruzioni per correggere i dati.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              name="rejection_reason"
              placeholder="Motivo del rifiuto (es: Documenti fiscali incompleti...)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedHost && rejectMutation.mutate({ 
                hostId: selectedHost.host_id, 
                reason: rejectionReason 
              })}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rifiuto in corso...' : 'Conferma Rifiuto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKYC;
