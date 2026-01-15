import { toast } from "sonner";
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface KYCUploadFormProps {
  onSuccess?: () => void;
  showNavigationButtons?: boolean;
}

export const KYCUploadForm = ({ onSuccess, showNavigationButtons = true }: KYCUploadFormProps = {}) => {
  const [documentType, setDocumentType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const documentTypes = [
    { value: 'passport', label: 'Passaporto' },
    { value: 'identity_card', label: 'Carta d\'Identità' },
    { value: 'drivers_license', label: 'Patente' },
    { value: 'tax_code', label: 'Codice Fiscale' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Formato non valido", { description: "Sono accettati solo file PDF, JPEG e PNG" });
      return;
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File troppo grande", { description: "La dimensione massima è 10MB" });
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !documentType) {
      toast.error("Campi mancanti", { description: "Seleziona un tipo di documento e carica un file" });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      if (expiresAt) {
        formData.append('expiresAt', expiresAt);
      }

      const { data, error } = await supabase.functions.invoke('upload-kyc-document', {
        body: formData,
      });

      if (error) {
        throw new Error(error.message || 'Errore durante il caricamento del documento');
      }

      if (!data.success) {
        const errorMessage = data.error || 'Upload fallito';
        throw new Error(errorMessage);
      }

      toast.success("✅ Documento caricato con successo", { description: "Il tuo documento è stato ricevuto ed è in verifica. Riceverai una notifica entro 24-48 ore." });

      // Reset form
      setFile(null);
      setDocumentType('');
      setExpiresAt('');
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Callback wizard
      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('KYC upload error:', error);
      
      let errorTitle = "Errore durante il caricamento";
      let errorDescription = error.message || "Si è verificato un errore. Riprova.";
      
      // Enhanced error messaging based on error type
      if (error.message?.includes('file')) {
        errorTitle = "Errore file";
        errorDescription = "Controlla che il file sia nel formato corretto (PDF, JPEG, PNG) e non superi i 10MB.";
      } else if (error.message?.includes('auth')) {
        errorTitle = "Errore autenticazione";
        errorDescription = "Effettua nuovamente il login e riprova.";
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorTitle = "Errore di connessione";
        errorDescription = "Verifica la tua connessione internet e riprova.";
      }
      
      toast.error(errorTitle, { description: errorDescription });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Carica Documento Identità
        </CardTitle>
        <CardDescription>
          Carica un documento di identità valido per completare la verifica KYC
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="document-type">Tipo Documento *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="document-type">
                <SelectValue placeholder="Seleziona tipo documento" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-upload">File Documento *</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Formati accettati: PDF, JPEG, PNG (max 10MB)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires-at">Data Scadenza (opzionale)</Label>
            <Input
              id="expires-at"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={isUploading}
            />
          </div>

          <Button
            type="submit"
            disabled={isUploading || !file || !documentType}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Caricamento...' : 'Carica Documento'}
          </Button>

          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Privacy e Sicurezza</p>
                <p className="text-xs text-muted-foreground">
                  I tuoi documenti sono criptati e accessibili solo agli amministratori autorizzati. 
                  La verifica richiede solitamente 24-48 ore.
                </p>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
