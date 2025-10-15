import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Shield } from "lucide-react";

interface HostFiscalDataFormProps {
  onSuccess?: () => void;
  showNavigationButtons?: boolean;
  onBack?: () => void;
}

export const HostFiscalDataForm = ({ 
  onSuccess, 
  showNavigationButtons = true,
  onBack 
}: HostFiscalDataFormProps = {}) => {
  const { authState } = useAuth();
  const profile = authState.profile;

  const [formData, setFormData] = useState({
    fiscal_regime: profile?.fiscal_regime || '',
    tax_id: profile?.tax_id || '',
    vat_number: profile?.vat_number || '',
    pec_email: profile?.pec_email || '',
    sdi_code: profile?.sdi_code || '',
    iban: profile?.iban || '',
    legal_address: profile?.legal_address || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!authState.user?.id) {
        toast.error('Utente non autenticato');
        return;
      }

      const { data, error } = await supabase.functions.invoke('update-tax-details', {
        body: formData,
      });

      if (error) throw error;

      toast.success('Dati fiscali aggiornati con successo');
      
      // Callback per wizard
      onSuccess?.();
      
      // Refresh profile only if not in wizard mode
      if (!onSuccess) {
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authState.user.id)
          .single();

        if (updatedProfile) {
          // Update auth state if needed
          window.location.reload();
        }
      }
    } catch (error: any) {
      console.error('Error updating tax details:', error);
      toast.error('Errore durante l\'aggiornamento: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getKycStatusBadge = () => {
    if (profile?.kyc_documents_verified === true) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <Shield className="h-4 w-4" />
          <span>Verificato</span>
        </div>
      );
    } else if (profile?.kyc_documents_verified === false) {
      return (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <Shield className="h-4 w-4" />
          <span>Rifiutato - {profile?.kyc_rejection_reason || 'Verifica i dati'}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 text-sm text-yellow-600">
          <Shield className="h-4 w-4" />
          <span>In attesa di verifica</span>
        </div>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dati Fiscali
          </CardTitle>
          {getKycStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fiscal_regime">Regime Fiscale *</Label>
            <Select
              value={formData.fiscal_regime}
              onValueChange={(value) => setFormData({ ...formData, fiscal_regime: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona regime fiscale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="privato">Privato (nessuna P.IVA)</SelectItem>
                <SelectItem value="forfettario">Forfettario (con P.IVA)</SelectItem>
                <SelectItem value="ordinario">Ordinario (con P.IVA)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.fiscal_regime === 'privato' && (
            <div>
              <Label htmlFor="tax_id">Codice Fiscale *</Label>
              <Input
                id="tax_id"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                placeholder="RSSMRA80A01H501U"
              />
            </div>
          )}

          {(formData.fiscal_regime === 'forfettario' || formData.fiscal_regime === 'ordinario') && (
            <>
              <div>
                <Label htmlFor="vat_number">Partita IVA *</Label>
                <Input
                  id="vat_number"
                  value={formData.vat_number}
                  onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                  placeholder="12345678901"
                />
              </div>

              <div>
                <Label htmlFor="pec_email">PEC</Label>
                <Input
                  id="pec_email"
                  type="email"
                  value={formData.pec_email}
                  onChange={(e) => setFormData({ ...formData, pec_email: e.target.value })}
                  placeholder="esempio@pec.it"
                />
              </div>

              <div>
                <Label htmlFor="sdi_code">Codice SDI</Label>
                <Input
                  id="sdi_code"
                  value={formData.sdi_code}
                  onChange={(e) => setFormData({ ...formData, sdi_code: e.target.value })}
                  placeholder="XXXXXXX"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Richiesto almeno uno tra PEC o Codice SDI
                </p>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="iban">IBAN *</Label>
            <Input
              id="iban"
              value={formData.iban}
              onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
              placeholder="IT60X0542811101000000123456"
            />
          </div>

          <div>
            <Label htmlFor="legal_address">Indirizzo Legale *</Label>
            <Input
              id="legal_address"
              value={formData.legal_address}
              onChange={(e) => setFormData({ ...formData, legal_address: e.target.value })}
              placeholder="Via Roma 1, 00100 Roma (RM)"
            />
          </div>

          {profile?.kyc_documents_verified === false && profile?.kyc_rejection_reason && (
            <div className="bg-destructive/10 p-3 rounded text-sm">
              <p className="font-medium text-destructive">Motivo del rifiuto:</p>
              <p className="mt-1">{profile.kyc_rejection_reason}</p>
            </div>
          )}

          {showNavigationButtons ? (
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Salvataggio...' : 'Salva Dati Fiscali'}
            </Button>
          ) : (
            <div className="flex justify-between pt-6">
              {onBack && (
                <Button variant="outline" onClick={onBack} type="button">
                  Indietro
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting} className="ml-auto">
                {isSubmitting ? 'Salvataggio...' : 'Continua'}
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            * Campi obbligatori. I dati saranno verificati da un amministratore prima di poter pubblicare spazi.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};
