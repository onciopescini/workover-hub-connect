
import React from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Download, Trash2, Edit3, Eye, FileText, Cookie } from "lucide-react";
import { DataRectificationRequest } from "@/components/gdpr/DataRectificationRequest";

const PrivacyCenter = () => {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Shield className="mx-auto h-16 w-16 text-blue-600 mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Centro Privacy
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Gestisci i tuoi dati personali e le tue preferenze privacy secondo i tuoi diritti GDPR
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Data Export */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Esporta i Tuoi Dati (Art. 15 GDPR)
                </CardTitle>
                <CardDescription>
                  Scarica una copia completa di tutti i tuoi dati personali
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Puoi richiedere una copia di tutti i dati che abbiamo su di te in formato JSON leggibile.
                </p>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                  <Download className="h-4 w-4 mr-2 inline" />
                  Richiedi Esportazione Dati
                </button>
              </CardContent>
            </Card>

            {/* Data Rectification */}
            <DataRectificationRequest />

            {/* Data Deletion */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Cancella Account (Art. 17 GDPR)
                </CardTitle>
                <CardDescription>
                  Richiedi la cancellazione permanente del tuo account e dati
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Questa azione è irreversibile. Tutti i tuoi dati verranno cancellati entro 30 giorni.
                </p>
                <button className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">
                  <Trash2 className="h-4 w-4 mr-2 inline" />
                  Richiedi Cancellazione Account
                </button>
              </CardContent>
            </Card>

            {/* Cookie Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cookie className="h-5 w-5" />
                  Preferenze Cookie
                </CardTitle>
                <CardDescription>
                  Gestisci le tue preferenze per i cookie e il tracciamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Controlla quali cookie e tecnologie di tracciamento desideri accettare.
                </p>
                <button className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                  <Cookie className="h-4 w-4 mr-2 inline" />
                  Gestisci Preferenze Cookie
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Additional Information */}
          <div className="mt-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informazioni sui Tuoi Diritti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2">Diritto di Accesso (Art. 15)</h4>
                    <p className="text-sm text-gray-600">
                      Hai il diritto di ottenere una copia dei tuoi dati personali e informazioni sul loro trattamento.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Diritto di Rettifica (Art. 16)</h4>
                    <p className="text-sm text-gray-600">
                      Puoi richiedere la correzione di dati personali inesatti o incompleti.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Diritto alla Cancellazione (Art. 17)</h4>
                    <p className="text-sm text-gray-600">
                      Puoi richiedere la cancellazione dei tuoi dati personali in determinate circostanze.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Diritto alla Portabilità (Art. 20)</h4>
                    <p className="text-sm text-gray-600">
                      Hai il diritto di ricevere i tuoi dati in un formato strutturato e leggibile.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Per ulteriori informazioni sui tuoi diritti privacy o per contattare il nostro Data Protection Officer, 
              scrivi a <a href="mailto:privacy@workover.it" className="text-blue-600 hover:underline">privacy@workover.it</a>
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default PrivacyCenter;
