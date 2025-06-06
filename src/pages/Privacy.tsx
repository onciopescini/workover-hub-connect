
import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Download, Trash2, Cookie, FileText, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useGDPRRequests } from "@/hooks/useGDPRRequests";
import { useConsent } from "@/hooks/useConsent";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const Privacy = () => {
  const { requests, isLoading } = useGDPRRequests();
  const { consent, handleConsent, resetConsent } = useConsent();

  const pendingExportRequest = requests.find(r => r.request_type === 'data_export' && r.status === 'pending');
  const completedExportRequest = requests.find(r => r.request_type === 'data_export' && r.status === 'completed');
  const pendingDeletionRequest = requests.find(r => r.request_type === 'data_deletion' && r.status === 'pending');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">In elaborazione</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completata</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rifiutata</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Shield className="mx-auto h-12 w-12 text-indigo-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Centro Privacy e Dati
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Gestisci i tuoi dati personali e le tue preferenze sulla privacy secondo i tuoi diritti GDPR
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Download className="h-5 w-5" />
                  Esporta i Tuoi Dati
                </CardTitle>
                <CardDescription>
                  Scarica una copia completa dei tuoi dati
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingExportRequest ? (
                  <div className="space-y-2">
                    {getStatusBadge(pendingExportRequest.status)}
                    <p className="text-sm text-gray-600">
                      Richiesta inviata il {new Date(pendingExportRequest.requested_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                ) : completedExportRequest && completedExportRequest.export_file_url ? (
                  <div className="space-y-3">
                    {getStatusBadge(completedExportRequest.status)}
                    <Button asChild className="w-full">
                      <a href={completedExportRequest.export_file_url} download>
                        <Download className="h-4 w-4 mr-2" />
                        Scarica Dati
                      </a>
                    </Button>
                  </div>
                ) : (
                  <Button asChild className="w-full">
                    <Link to="/privacy/export-request">
                      <Download className="h-4 w-4 mr-2" />
                      Richiedi Esportazione
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trash2 className="h-5 w-5" />
                  Cancella Account
                </CardTitle>
                <CardDescription>
                  Richiedi la cancellazione permanente dei dati
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingDeletionRequest ? (
                  <div className="space-y-2">
                    {getStatusBadge(pendingDeletionRequest.status)}
                    <p className="text-sm text-gray-600">
                      Richiesta inviata il {new Date(pendingDeletionRequest.requested_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                ) : (
                  <Button asChild variant="destructive" className="w-full">
                    <Link to="/privacy/deletion-request">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Richiedi Cancellazione
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cookie className="h-5 w-5" />
                  Preferenze Cookie
                </CardTitle>
                <CardDescription>
                  Gestisci le tue preferenze sui cookie
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span>Analytics:</span>
                    <span className={consent.analytics ? "text-green-600" : "text-red-600"}>
                      {consent.analytics ? "Abilitati" : "Disabilitati"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Marketing:</span>
                    <span className={consent.marketing ? "text-green-600" : "text-red-600"}>
                      {consent.marketing ? "Abilitati" : "Disabilitati"}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={resetConsent}
                  >
                    Modifica Preferenze
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Request History */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Cronologia Richieste
              </CardTitle>
              <CardDescription>
                Visualizza lo stato delle tue richieste GDPR
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-gray-600">Caricamento...</p>
              ) : requests.length === 0 ? (
                <p className="text-gray-600">Nessuna richiesta effettuata</p>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">
                          {request.request_type === 'data_export' ? 'Esportazione Dati' : 'Cancellazione Account'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Richiesta inviata il {new Date(request.requested_at).toLocaleDateString('it-IT')}
                        </p>
                        {request.notes && (
                          <p className="text-sm text-gray-500">{request.notes}</p>
                        )}
                      </div>
                      <div className="text-right space-y-2">
                        {getStatusBadge(request.status)}
                        {request.status === 'completed' && request.completed_at && (
                          <p className="text-xs text-gray-500">
                            Completata il {new Date(request.completed_at).toLocaleDateString('it-IT')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* GDPR Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                I Tuoi Diritti secondo il GDPR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Diritto di Accesso (Art. 15)</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Hai il diritto di ottenere una copia dei tuoi dati personali e informazioni sul loro trattamento.
                  </p>
                  
                  <h4 className="font-semibold mb-2">Diritto di Rettifica (Art. 16)</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Puoi richiedere la correzione di dati personali inesatti o incompleti tramite le impostazioni del profilo.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Diritto alla Cancellazione (Art. 17)</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Puoi richiedere la cancellazione dei tuoi dati personali in determinate circostanze.
                  </p>
                  
                  <h4 className="font-semibold mb-2">Diritto alla Portabilità (Art. 20)</h4>
                  <p className="text-sm text-gray-600">
                    Hai il diritto di ricevere i tuoi dati in un formato strutturato e leggibile.
                  </p>
                </div>
              </div>

              <Separator className="my-6" />
              
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Per ulteriori informazioni sui tuoi diritti privacy o per contattare il nostro Data Protection Officer, 
                  scrivi a{" "}
                  <a href="mailto:privacy@workover.it" className="text-indigo-600 hover:underline">
                    privacy@workover.it
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Privacy;
