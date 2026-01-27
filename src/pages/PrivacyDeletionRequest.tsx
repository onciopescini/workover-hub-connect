import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Trash2, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import * as privacyService from '@/services/api/privacyService';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import { sreLogger } from '@/lib/sre-logger';

const PrivacyDeletionRequest = () => {
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!confirmed || !reason.trim()) {
      toast.error('Completa tutti i campi richiesti');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await privacyService.confirmAccountDeletion(reason);

      if (!result.success) {
        toast.error(result.error || 'Errore durante l\'invio della richiesta');
        return;
      }

      toast.success('Richiesta inviata! Controlla la tua email per confermare.');
      navigate('/privacy');
    } catch (error) {
      sreLogger.error('Error submitting deletion request', { component: 'PrivacyDeletionRequest' }, error as Error);
      toast.error('Errore durante l\'invio della richiesta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckedChange = (checked: boolean | "indeterminate") => {
    // Convert indeterminate to false for our boolean state
    setConfirmed(checked === true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/privacy">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna al Centro Privacy
            </Link>
          </Button>
          
          <div className="text-center">
            <Trash2 className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Richiesta Cancellazione Account
            </h1>
            <p className="text-lg text-gray-600">
              Richiedi la cancellazione permanente del tuo account e di tutti i dati associati
            </p>
          </div>
        </div>

        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Attenzione:</strong> Questa azione è irreversibile. Una volta approvata la richiesta, 
            tutti i tuoi dati verranno cancellati permanentemente entro 30 giorni e non potranno essere recuperati.
          </AlertDescription>
        </Alert>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Cosa Comporta la Cancellazione</CardTitle>
            <CardDescription>
              La cancellazione dell'account comporterà l'eliminazione di tutti i tuoi dati
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Dati che verranno eliminati:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Profilo e informazioni personali</li>
                    <li>• Tutti i messaggi inviati</li>
                    <li>• Recensioni scritte</li>
                    <li>• Preferenze e impostazioni</li>
                    <li>• Storico accessi</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2 text-amber-600">Dati che potrebbero rimanere:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Transazioni (per obblighi fiscali)</li>
                    <li>• Dati aggregati anonimi</li>
                    <li>• Log di sicurezza (per 12 mesi)</li>
                  </ul>
                </div>
              </div>

              <Separator />

              <div className="bg-amber-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-amber-800">Considerazioni Importanti</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Se hai prenotazioni attive, verranno cancellate</li>
                  <li>• Se sei un host, i tuoi spazi verranno rimossi</li>
                  <li>• Eventuali pagamenti pendenti verranno processati</li>
                  <li>• Non potrai più accedere alla piattaforma</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conferma Richiesta</CardTitle>
            <CardDescription>
              Fornisci una motivazione per la cancellazione dell'account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo della Cancellazione
                </label>
                <Textarea
                  id="reason"
                  placeholder="Descrivi il motivo per cui vuoi cancellare il tuo account..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <Separator />

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Diritti secondo il GDPR</h4>
                <p className="text-sm text-gray-600">
                  Secondo l'Articolo 17 del GDPR (Diritto alla cancellazione), hai il diritto di ottenere 
                  dal titolare del trattamento la cancellazione dei dati personali che ti riguardano 
                  senza ingiustificato ritardo.
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="confirm"
                  checked={confirmed}
                  onCheckedChange={handleCheckedChange}
                />
                <label htmlFor="confirm" className="text-sm text-gray-700 leading-tight">
                  Confermo di aver compreso che questa azione è irreversibile e che tutti i miei dati 
                  verranno cancellati permanentemente. Comprendo inoltre che la richiesta verrà 
                  elaborata entro 30 giorni secondo quanto previsto dal GDPR.
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" asChild className="flex-1">
                  <Link to="/privacy">
                    Annulla
                  </Link>
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!confirmed || !reason.trim() || isSubmitting}
                  variant="destructive"
                  className="flex-1"
                >
                  {isSubmitting ? 'Invio...' : 'Invia Richiesta di Cancellazione'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Hai ripensamenti o domande? Contatta il nostro Data Protection Officer a{" "}
            <a href="mailto:privacy@workover.it.com" className="text-indigo-600 hover:underline">
              privacy@workover.it.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyDeletionRequest;
