
import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Download, Trash2, Shield, FileText, Clock, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExportUserDataResponse {
  error?: string;
  profile?: any;
  bookings?: any[];
  spaces?: any[];
  messages?: any[];
  reviews_given?: any[];
  reviews_received?: any[];
  connections?: any[];
  payments?: any[];
  notifications?: any[];
  gdpr_requests?: any[];
  exported_at?: string;
}

interface RequestDataDeletionResponse {
  error?: string;
  success?: boolean;
  request_id?: string;
}

const PrivacyCenter = () => {
  const { authState } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);

  const handleDataExport = async () => {
    if (!authState.user) return;
    
    setIsExporting(true);
    try {
      const { data, error } = await supabase.rpc('export_user_data', {
        target_user_id: authState.user.id
      });

      if (error) throw error;

      const exportResult = data as ExportUserDataResponse;
      
      if (exportResult.error) {
        toast.error(exportResult.error);
        return;
      }

      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(exportResult, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workover-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log the request
      await supabase.from('gdpr_requests').insert({
        user_id: authState.user.id,
        request_type: 'data_export',
        status: 'completed',
        completed_at: new Date().toISOString()
      });

      toast.success("I tuoi dati sono stati esportati con successo!");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Errore durante l'esportazione dei dati");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDataDeletion = async () => {
    if (!authState.user) return;
    
    setIsRequestingDeletion(true);
    try {
      const { data, error } = await supabase.rpc('request_data_deletion', {
        target_user_id: authState.user.id,
        deletion_reason: deletionReason || null
      });

      if (error) throw error;

      const deletionResult = data as RequestDataDeletionResponse;
      
      if (deletionResult.error) {
        toast.error(deletionResult.error);
        return;
      }

      toast.success("Richiesta di cancellazione inviata. Riceverai una conferma via email.");
      setDeletionReason("");
    } catch (error) {
      console.error("Error requesting deletion:", error);
      toast.error("Errore durante la richiesta di cancellazione");
    } finally {
      setIsRequestingDeletion(false);
    }
  };

  return (
    <AppLayout
      title="Centro Privacy"
      subtitle="Gestisci i tuoi dati personali e le impostazioni privacy"
    >
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Data Rights Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              I Tuoi Diritti Privacy (GDPR)
            </CardTitle>
            <CardDescription>
              In conformità al Regolamento Generale sulla Protezione dei Dati (GDPR), 
              hai diritto a gestire i tuoi dati personali.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Diritto di Accesso</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Ottieni una copia di tutti i tuoi dati personali che conserviamo.
                </p>
                <Button 
                  onClick={handleDataExport}
                  disabled={isExporting}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Esportazione..." : "Esporta i Miei Dati"}
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Diritto alla Cancellazione</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Richiedi la cancellazione completa del tuo account e dei tuoi dati.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Richiedi Cancellazione
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                        Richiesta Cancellazione Account
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Questa azione è irreversibile. Tutti i tuoi dati verranno cancellati 
                        definitivamente dal nostro sistema entro 30 giorni.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="deletionReason">
                          Motivo della cancellazione (opzionale)
                        </Label>
                        <Textarea
                          id="deletionReason"
                          value={deletionReason}
                          onChange={(e) => setDeletionReason(e.target.value)}
                          placeholder="Specifica il motivo per cui vuoi cancellare il tuo account..."
                          className="mt-2"
                        />
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDataDeletion}
                        disabled={isRequestingDeletion}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isRequestingDeletion ? "Inviando..." : "Conferma Cancellazione"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Data Processing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Come Trattiamo i Tuoi Dati
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Dati di Profilo</h4>
                <p className="text-sm text-blue-800">
                  Nome, email, foto profilo e informazioni di contatto per l'identificazione 
                  e la comunicazione sulla piattaforma.
                </p>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Dati di Prenotazione</h4>
                <p className="text-sm text-green-800">
                  Cronologia prenotazioni, pagamenti e recensioni per fornire il servizio 
                  e gestire le transazioni.
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Dati di Comunicazione</h4>
                <p className="text-sm text-purple-800">
                  Messaggi e interazioni per facilitare la comunicazione tra host e coworker.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Retention Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Politica di Conservazione Dati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Dati di profilo attivi</span>
                <span className="text-gray-600">Fino alla cancellazione dell'account</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Account inattivi</span>
                <span className="text-gray-600">Cancellati dopo 24 mesi</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Dati di prenotazione</span>
                <span className="text-gray-600">Anonimizzati dopo 7 anni</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium">Messaggi</span>
                <span className="text-gray-600">Cancellati dopo 5 anni</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Hai Domande sulla Privacy?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Per qualsiasi domanda sui tuoi diritti privacy o sui nostri trattamenti dati, 
              contatta il nostro Data Protection Officer.
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/contact'}>
              Contatta il DPO
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PrivacyCenter;
