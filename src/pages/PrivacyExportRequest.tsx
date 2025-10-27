import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useGDPRRequests } from "@/hooks/useGDPRRequests";
import { Download, AlertCircle, User, Activity, Star, CreditCard, CheckCircle, Loader2, Archive } from "lucide-react";

const PHASES = [
  { id: 1, name: "Dati Profilo", icon: User },
  { id: 2, name: "Prenotazioni", icon: Activity },
  { id: 3, name: "File Allegati", icon: Archive },
  { id: 4, name: "Generazione PDF", icon: Download },
  { id: 5, name: "Creazione ZIP", icon: Archive },
  { id: 6, name: "Finalizzazione", icon: CheckCircle },
];

export default function PrivacyExportRequest() {
  const navigate = useNavigate();
  const { startInstantExport } = useGDPRRequests();
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseMessage, setPhaseMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleStartExport = async () => {
    setIsExporting(true);
    setError(null);
    setCurrentPhase(0);
    setIsCompleted(false);

    await startInstantExport(
      // onProgress
      (phase: number, message: string) => {
        setCurrentPhase(phase);
        setPhaseMessage(message);
      },
      // onComplete
      (url: string, size: number) => {
        setDownloadUrl(url);
        setFileSize(size);
        setIsCompleted(true);
        setIsExporting(false);
        
        // Auto-download
        const link = document.createElement('a');
        link.href = url;
        link.download = 'gdpr_export.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      // onError
      (errorMessage: string) => {
        setError(errorMessage);
        setIsExporting(false);
      }
    );
  };

  const handleCancel = () => {
    navigate("/dashboard");
  };

  if (isExporting || isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              {isCompleted ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isCompleted ? "Esportazione Completata!" : "Esportazione in Corso"}
            </h1>
            <p className="text-lg text-gray-600">
              {isCompleted 
                ? "I tuoi dati sono stati esportati con successo"
                : "Stiamo preparando il tuo archivio GDPR..."}
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              {error ? (
                <div className="text-center">
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-600">
                      {error}
                    </AlertDescription>
                  </Alert>
                  <Button onClick={handleCancel} variant="outline">
                    Torna al Dashboard
                  </Button>
                </div>
              ) : isCompleted ? (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800 font-medium">
                      Download completato! Il file ZIP è stato scaricato automaticamente.
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Dimensione file: {formatFileSize(fileSize)}
                    </p>
                  </div>
                  
                  {downloadUrl && (
                    <Button 
                      onClick={() => window.open(downloadUrl, '_blank')}
                      className="mb-4"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Scarica di Nuovo
                    </Button>
                  )}
                  
                  <Button onClick={handleCancel} variant="outline">
                    Torna al Dashboard
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progresso</span>
                      <span>{currentPhase}/6</span>
                    </div>
                    <Progress value={(currentPhase / 6) * 100} className="h-2" />
                  </div>

                  {/* Current Phase */}
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {phaseMessage}
                    </p>
                  </div>

                  {/* Phase List */}
                  <div className="space-y-3">
                    {PHASES.map((phase) => {
                      const Icon = phase.icon;
                      const isActive = phase.id === currentPhase;
                      const isCompleted = phase.id < currentPhase;
                      
                      return (
                        <div
                          key={phase.id}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-blue-50 border border-blue-200'
                              : isCompleted
                              ? 'bg-green-50'
                              : 'bg-gray-50'
                          }`}
                        >
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              isActive
                                ? 'bg-blue-600'
                                : isCompleted
                                ? 'bg-green-600'
                                : 'bg-gray-400'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="h-4 w-4 text-white" />
                            ) : isActive ? (
                              <Loader2 className="h-4 w-4 text-white animate-spin" />
                            ) : (
                              <Icon className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <span
                            className={`font-medium ${
                              isActive
                                ? 'text-blue-900'
                                : isCompleted
                                ? 'text-green-900'
                                : 'text-gray-600'
                            }`}
                          >
                            {phase.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-center pt-4">
                    <p className="text-sm text-gray-500">
                      Non chiudere questa pagina durante l'esportazione
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Download className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Esportazione Dati GDPR
          </h1>
          <p className="text-lg text-gray-600">
            Download istantaneo di tutti i tuoi dati in formato ZIP
          </p>
        </div>

        {/* Data Types */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Contenuto dell'Archivio ZIP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-medium">PDF Dati Utente</h3>
                  <p className="text-sm text-gray-600">Profilo, prenotazioni, recensioni</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Archive className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-medium">File Allegati</h3>
                  <p className="text-sm text-gray-600">Foto profilo, allegati messaggi</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Activity className="h-5 w-5 text-yellow-600" />
                <div>
                  <h3 className="font-medium">Cronologia Completa</h3>
                  <p className="text-sm text-gray-600">Tutte le attività e transazioni</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                <div>
                  <h3 className="font-medium">Download Istantaneo</h3>
                  <p className="text-sm text-gray-600">Disponibile immediatamente</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Process Info */}
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            L'esportazione è istantanea e il file ZIP sarà disponibile per 24 ore. 
            Puoi richiedere una nuova esportazione in qualsiasi momento.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="min-w-[120px]"
          >
            Annulla
          </Button>
          
          <Button 
            onClick={handleStartExport}
            disabled={isExporting}
            className="min-w-[200px] bg-blue-600 hover:bg-blue-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Inizia Esportazione
          </Button>
        </div>

        {/* Contact Info */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Hai domande? Contatta il nostro Data Protection Officer:</p>
          <p className="font-medium">
            <a href="mailto:privacy@workover.it.com" className="text-indigo-600 hover:underline">
              privacy@workover.it.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}