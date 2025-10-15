import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const kycSchema = z.object({
  id_document: z.instanceof(File).optional(),
  proof_iban: z.instanceof(File).optional(),
  vat_certificate: z.instanceof(File).optional(),
  business_certificate: z.instanceof(File).optional(),
});

type KYCFormData = z.infer<typeof kycSchema>;

export const KYCDocumentUpload = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, fiscal_regime, kyc_documents_verified')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: existingDocs } = useQuery({
    queryKey: ['kyc-documents', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KYCFormData>({
    resolver: zodResolver(kycSchema),
  });

  const uploadFile = async (file: File, type: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile?.id}/${type}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError, data } = await supabase.storage
      .from('kyc-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(fileName);

    return { fileName, publicUrl };
  };

  const onSubmit = async (data: KYCFormData) => {
    setIsUploading(true);
    
    try {
      const documents: Array<{ type: string; file: File }> = [];
      
      if (data.id_document) documents.push({ type: 'id_document', file: data.id_document });
      if (data.proof_iban) documents.push({ type: 'proof_iban', file: data.proof_iban });
      if (data.vat_certificate) documents.push({ type: 'vat_certificate', file: data.vat_certificate });
      if (data.business_certificate) documents.push({ type: 'business_certificate', file: data.business_certificate });

      for (const { type, file } of documents) {
        const { fileName, publicUrl } = await uploadFile(file, type);
        
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      await supabase.from('kyc_documents').insert({
        user_id: user.id,
        document_type: type,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        verification_status: 'pending'
      });
      }

      toast({
        title: "Documenti Caricati",
        description: "I tuoi documenti sono stati inviati e sono in attesa di verifica.",
      });

    } catch (error: any) {
      console.error('KYC upload error:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante il caricamento dei documenti",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getRequiredDocuments = () => {
    switch (profile?.fiscal_regime) {
      case 'privato':
        return ['id_document', 'proof_iban'];
      case 'forfettario':
        return ['id_document', 'proof_iban', 'vat_certificate'];
      case 'ordinario':
        return ['id_document', 'proof_iban', 'business_certificate'];
      default:
        return [];
    }
  };

  const requiredDocs = getRequiredDocuments();

  if (profile?.kyc_documents_verified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Documenti Verificati
          </CardTitle>
          <CardDescription>
            I tuoi documenti KYC sono stati verificati e approvati.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Caricamento Documenti KYC</CardTitle>
        <CardDescription>
          Carica i documenti richiesti per la verifica del tuo account (regime: {profile?.fiscal_regime})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {requiredDocs.includes('id_document') && (
            <div className="space-y-2">
              <Label htmlFor="id_document">
                Documento d'Identità * <FileText className="inline h-4 w-4" />
              </Label>
              <Input
                id="id_document"
                type="file"
                accept="image/*,application/pdf"
                {...register('id_document')}
              />
              {errors.id_document && (
                <p className="text-sm text-destructive">{errors.id_document.message}</p>
              )}
            </div>
          )}

          {requiredDocs.includes('proof_iban') && (
            <div className="space-y-2">
              <Label htmlFor="proof_iban">
                Prova IBAN * <FileText className="inline h-4 w-4" />
              </Label>
              <Input
                id="proof_iban"
                type="file"
                accept="image/*,application/pdf"
                {...register('proof_iban')}
              />
            </div>
          )}

          {requiredDocs.includes('vat_certificate') && (
            <div className="space-y-2">
              <Label htmlFor="vat_certificate">
                Attestazione Partita IVA * <FileText className="inline h-4 w-4" />
              </Label>
              <Input
                id="vat_certificate"
                type="file"
                accept="image/*,application/pdf"
                {...register('vat_certificate')}
              />
            </div>
          )}

          {requiredDocs.includes('business_certificate') && (
            <div className="space-y-2">
              <Label htmlFor="business_certificate">
                Visura Camerale * <FileText className="inline h-4 w-4" />
              </Label>
              <Input
                id="business_certificate"
                type="file"
                accept="image/*,application/pdf"
                {...register('business_certificate')}
              />
            </div>
          )}

          {existingDocs && existingDocs.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Hai già caricato {existingDocs.length} documento/i in attesa di verifica.
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isUploading} className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? 'Caricamento...' : 'Carica Documenti'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
