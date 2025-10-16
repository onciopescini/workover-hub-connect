import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface KYCUploadFormProps {
  onSuccess?: () => void;
  showNavigationButtons?: boolean;
}

export const KYCUploadForm = ({ onSuccess, showNavigationButtons = true }: KYCUploadFormProps = {}) => {
  const { toast } = useToast();
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
      toast({
        title: "Formato non valido",
        description: "Sono accettati solo file PDF, JPEG e PNG",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File troppo grande",
        description: "La dimensione massima è 10MB",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !documentType) {
      toast({
        title: "Campi mancanti",
        description: "Seleziona un tipo di documento e carica un file",
        variant: "destructive",
      });
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

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      toast({
        title: "✅ Documento caricato",
        description: "Il tuo documento è in verifica. Riceverai una notifica a breve.",
      });

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
      toast({
        title: "❌ Errore upload",
        description: error.message || "Si è verificato un errore durante il caricamento",
        variant: "destructive",
      });
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
