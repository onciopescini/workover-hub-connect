import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Eye, Download, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminKYCReviewPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: pendingDocs, isLoading } = useQuery({
    queryKey: ['kyc-pending-docs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kyc_documents')
        .select(`
          *,
          profiles(id, first_name, last_name, email, fiscal_regime)
        `)
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: verifiedDocs } = useQuery({
    queryKey: ['kyc-verified-docs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kyc_documents')
        .select(`
          *,
          profiles(id, first_name, last_name, email, fiscal_regime)
        `)
        .eq('verification_status', 'approved')
        .order('verified_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (docId: string) => {
      const doc = pendingDocs?.find(d => d.id === docId);
      if (!doc) throw new Error('Document not found');

      // Update document status
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: docError } = await supabase
        .from('kyc_documents')
        .update({
          verification_status: 'approved',
          verified_at: new Date().toISOString(),
          verified_by: user?.id || null
        })
        .eq('id', docId);

      if (docError) throw docError;

      // Check if all user's documents are approved
      const { data: userDocs } = await supabase
        .from('kyc_documents')
        .select('verification_status')
        .eq('user_id', doc.user_id);

      const allApproved = userDocs?.every(d => d.verification_status === 'approved');

      if (allApproved) {
        // Update profile as KYC verified
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            kyc_documents_verified: true,
            kyc_verified_at: new Date().toISOString()
          })
          .eq('id', doc.user_id);

        if (profileError) throw profileError;

        // Send notification
        await supabase.from('user_notifications').insert({
          user_id: doc.user_id,
          type: 'kyc',
          title: 'Documenti KYC Approvati',
          content: 'I tuoi documenti KYC sono stati verificati e approvati. Ora puoi ricevere pagamenti.',
          metadata: { document_id: docId }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-pending-docs'] });
      queryClient.invalidateQueries({ queryKey: ['kyc-verified-docs'] });
      toast({
        title: "Documento Approvato",
        description: "Il documento è stato approvato con successo.",
      });
      setSelectedDoc(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ docId, reason }: { docId: string; reason: string }) => {
      const doc = pendingDocs?.find(d => d.id === docId);
      if (!doc) throw new Error('Document not found');

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: docError } = await supabase
        .from('kyc_documents')
        .update({
          verification_status: 'rejected',
          rejection_reason: reason,
          verified_at: new Date().toISOString(),
          verified_by: user?.id || null
        })
        .eq('id', docId);

      if (docError) throw docError;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          kyc_rejection_reason: reason
        })
        .eq('id', doc.user_id);

      if (profileError) throw profileError;

      // Send notification
      await supabase.from('user_notifications').insert({
        user_id: doc.user_id,
        type: 'kyc',
        title: 'Documento KYC Rifiutato',
        content: `Uno dei tuoi documenti è stato rifiutato. Motivo: ${reason}. Carica un documento valido.`,
        metadata: { document_id: docId, rejection_reason: reason }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-pending-docs'] });
      toast({
        title: "Documento Rifiutato",
        description: "Il documento è stato rifiutato e l'utente è stato notificato.",
      });
      setSelectedDoc(null);
      setRejectionReason("");
    }
  });

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      id_document: 'Documento Identità',
      proof_iban: 'Prova IBAN',
      vat_certificate: 'Attestazione P.IVA',
      business_certificate: 'Visura Camerale'
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return <div>Caricamento...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Verifica KYC</h1>
        <p className="text-muted-foreground">Gestisci le richieste di verifica documenti host</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            In Attesa ({pendingDocs?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verificati
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {!pendingDocs || pendingDocs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nessun documento in attesa di verifica</p>
              </CardContent>
            </Card>
          ) : (
            pendingDocs.map((doc) => (
              <Card key={doc.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{doc.profiles.first_name} {doc.profiles.last_name}</CardTitle>
                      <CardDescription>
                        {doc.profiles.email} • {getDocTypeLabel(doc.document_type)}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {doc.profiles.fiscal_regime}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Caricato il: {new Date(doc.created_at).toLocaleDateString('it-IT')}</span>
                    <span>•</span>
                    <span>Dimensione: {doc.file_size ? (doc.file_size / 1024).toFixed(0) : 'N/A'} KB</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.file_url, '_blank')}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizza
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = doc.file_url;
                        a.download = doc.file_name;
                        a.click();
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Scarica
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => approveMutation.mutate(doc.id)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approva
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rifiuta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="verified" className="space-y-4">
          {!verifiedDocs || verifiedDocs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nessun documento verificato</p>
              </CardContent>
            </Card>
          ) : (
            verifiedDocs.map((doc) => (
              <Card key={doc.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        {doc.profiles.first_name} {doc.profiles.last_name}
                      </CardTitle>
                      <CardDescription>
                        {doc.profiles.email} • {getDocTypeLabel(doc.document_type)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Verificato il: {doc.verified_at ? new Date(doc.verified_at).toLocaleDateString('it-IT') : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta Documento</DialogTitle>
            <DialogDescription>
              Specifica il motivo del rifiuto. L'utente sarà notificato.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo del Rifiuto *</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Es: Documento scaduto, immagine non leggibile, informazioni incomplete..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDoc(null);
                  setRejectionReason("");
                }}
              >
                Annulla
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectMutation.mutate({ 
                  docId: selectedDoc.id, 
                  reason: rejectionReason 
                })}
                disabled={!rejectionReason || rejectMutation.isPending}
              >
                Conferma Rifiuto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
