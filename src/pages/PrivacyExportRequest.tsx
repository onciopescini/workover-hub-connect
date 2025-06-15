import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Download, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useGDPRRequests } from "@/hooks/useGDPRRequests";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const PrivacyExportRequest = () => {
  const navigate = useNavigate();
  const { submitExportRequest, isLoading } = useGDPRRequests();
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const success = await submitExportRequest();
    if (success) {
      navigate('/privacy');
    }
    setIsSubmitting(false);
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
            <Download className="mx-auto h-12 w-12 text-indigo-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Richiesta Esportazione Dati
            </h1>
            <p className="text-lg text-gray-600">
              Richiedi una copia completa di tutti i tuoi dati personali
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Cosa Include l'Esportazione</CardTitle>
            <CardDescription>
              La tua esportazione dati includerà tutti i dati personali che abbiamo su di te
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Dati del Profilo</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Informazioni personali</li>
                  <li>• Foto profilo</li>
                  <li>• Preferenze account</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Attività</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Prenotazioni effettuate</li>
                  <li>• Spazi creati (se host)</li>
                  <li>• Messaggi inviati</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Recensioni</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Recensioni scritte</li>
                  <li>• Recensioni ricevute</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Transazioni</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Storico pagamenti</li>
                  <li>• Ricevute</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> La preparazione del file di esportazione può richiedere fino a 30 giorni 
            secondo quanto previsto dal GDPR. Ti invieremo una notifica quando sarà pronto per il download.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Conferma Richiesta</CardTitle>
            <CardDescription>
              Invia la tua richiesta di esportazione dati
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Note Aggiuntive (Opzionale)
                </label>
                <Textarea
                  id="notes"
                  placeholder="Aggiungi eventuali note o richieste specifiche..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Separator />

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Diritti secondo il GDPR</h4>
                <p className="text-sm text-gray-600">
                  Secondo l'Articolo 15 del GDPR, hai il diritto di ottenere dal titolare del trattamento 
                  la conferma che sia o meno in corso un trattamento di dati personali che ti riguardano 
                  e, in tal caso, di ottenere l'accesso ai dati personali.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" asChild className="flex-1">
                  <Link to="/privacy">
                    Annulla
                  </Link>
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLoading}
                  className="flex-1"
                >
                  {isSubmitting ? 'Invio...' : 'Invia Richiesta'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Hai domande? Contatta il nostro Data Protection Officer a{" "}
            <a href="mailto:privacy@workover.it" className="text-indigo-600 hover:underline">
              privacy@workover.it
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyExportRequest;
