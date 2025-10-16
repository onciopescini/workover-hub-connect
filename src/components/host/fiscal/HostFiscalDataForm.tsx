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
  refreshProfile?: () => Promise<void>;
}

export const HostFiscalDataForm = ({ 
  onSuccess, 
  showNavigationButtons = true,
  onBack,
  refreshProfile
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
    // Structured address fields
    address_line1: '',
    address_line2: '',
    city: '',
    province: '',
    postal_code: '',
    country_code: 'IT',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-parse legal_address into structured fields on mount
  React.useEffect(() => {
    if (profile?.legal_address && !formData.address_line1) {
      const parts = profile.legal_address.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        setFormData(prev => ({
          ...prev,
          address_line1: parts[0] || '',
          city: parts[1]?.match(/\d{5}\s+(.+)\s+\(/)?.[1] || '',
          postal_code: parts[1]?.match(/(\d{5})/)?.[1] || '',
          province: parts[1]?.match(/\(([A-Z]{2})\)/)?.[1] || '',
        }));
      }
    }
  }, [profile?.legal_address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!authState.user?.id) {
        toast.error('Utente non autenticato');
        return;
      }

      // Validation for structured address fields
      if (!formData.address_line1 || !formData.city || !formData.postal_code || !formData.province) {
        toast.error('Compila tutti i campi obbligatori dell\'indirizzo');
        setIsSubmitting(false);
        return;
      }

      // Validate CAP (5 digits)
      if (!/^\d{5}$/.test(formData.postal_code)) {
        toast.error('Il CAP deve essere di 5 cifre');
        setIsSubmitting(false);
        return;
      }

      // Validate Province (2 uppercase letters)
      if (!/^[A-Z]{2}$/.test(formData.province)) {
        toast.error('La provincia deve essere di 2 lettere maiuscole (es. RM)');
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('update-tax-details', {
        body: formData,
      });

      if (error) throw error;

      // ✅ FASE 2: Blocca avanzamento se dati incompleti
      if (data?.partial || !data?.success) {
        if (data?.missingFields) {
          toast.error(`Campi mancanti: ${data.missingFields.join(', ')}`);
        } else {
          toast.error('Completa tutti i campi obbligatori prima di procedere');
        }
        setIsSubmitting(false);
        return;
      }

      toast.success('Dati fiscali salvati con successo');
      
      // WIZARD MODE: refresh profile BEFORE advancing
      if (onSuccess) {
        await refreshProfile?.();
        await new Promise(resolve => setTimeout(resolve, 300)); // Delay for state propagation
        onSuccess();
      } else {
        // STANDALONE MODE: reload as before
        window.location.reload();
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

          {/* Structured Address Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium mb-3">Indirizzo Dettagliato (richiesto per pubblicare spazi)</h3>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="address_line1">Via/Piazza e Numero Civico *</Label>
                <Input
                  id="address_line1"
                  value={formData.address_line1}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  placeholder="Via Roma 1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="address_line2">Scala/Interno (opzionale)</Label>
                <Input
                  id="address_line2"
                  value={formData.address_line2}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                  placeholder="Scala A, Interno 5"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">Città *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Roma"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="province">Provincia *</Label>
                  <Input
                    id="province"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value.toUpperCase() })}
                    placeholder="RM"
                    maxLength={2}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="postal_code">CAP *</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="00100"
                    maxLength={5}
                    pattern="\d{5}"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="country_code">Nazione *</Label>
                  <Select
                    value={formData.country_code}
                    onValueChange={(value) => setFormData({ ...formData, country_code: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IT">Italia</SelectItem>
                      <SelectItem value="FR">Francia</SelectItem>
                      <SelectItem value="DE">Germania</SelectItem>
                      <SelectItem value="ES">Spagna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
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
