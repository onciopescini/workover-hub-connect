import React, { useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, CheckCircle2, AlertCircle } from "lucide-react";
import { useFiscalValidation } from '@/hooks/useFiscalValidation';
import { useDebouncedValue } from '@/hooks/useDebounce';

export interface CoworkerFiscalData {
  tax_id: string;
  is_business: boolean;
  pec_email: string;
  sdi_code: string;
  billing_address: string;
  billing_city: string;
  billing_province: string;
  billing_postal_code: string;
}

interface CheckoutFiscalFieldsProps {
  requestInvoice: boolean;
  onToggleInvoice: (value: boolean) => void;
  fiscalData: CoworkerFiscalData;
  onFiscalDataChange: (data: CoworkerFiscalData) => void;
  hostHasVat: boolean;
  errors?: Record<string, string>;
}

export const CheckoutFiscalFields: React.FC<CheckoutFiscalFieldsProps> = ({
  requestInvoice,
  onToggleInvoice,
  fiscalData,
  onFiscalDataChange,
  hostHasVat,
  errors = {}
}) => {
  const { validationState, validateField, clearFieldError, resetValidation } = useFiscalValidation(fiscalData.is_business);
  
  // Debounced values for real-time validation
  const debouncedTaxId = useDebouncedValue(fiscalData.tax_id, 500);
  const debouncedPecEmail = useDebouncedValue(fiscalData.pec_email, 500);
  const debouncedSdiCode = useDebouncedValue(fiscalData.sdi_code, 500);
  const debouncedAddress = useDebouncedValue(fiscalData.billing_address, 500);
  const debouncedCity = useDebouncedValue(fiscalData.billing_city, 500);
  const debouncedProvince = useDebouncedValue(fiscalData.billing_province, 500);
  const debouncedPostalCode = useDebouncedValue(fiscalData.billing_postal_code, 500);

  // Real-time validation on debounced values
  useEffect(() => {
    if (requestInvoice && debouncedTaxId) {
      validateField('tax_id', debouncedTaxId);
    }
  }, [debouncedTaxId, requestInvoice, validateField]);

  useEffect(() => {
    if (requestInvoice && fiscalData.is_business) {
      validateField('pec_email', debouncedPecEmail, {
        pec_email: debouncedPecEmail,
        sdi_code: fiscalData.sdi_code,
      });
    }
  }, [debouncedPecEmail, fiscalData.is_business, fiscalData.sdi_code, requestInvoice, validateField]);

  useEffect(() => {
    if (requestInvoice && fiscalData.is_business) {
      validateField('sdi_code', debouncedSdiCode, {
        pec_email: fiscalData.pec_email,
        sdi_code: debouncedSdiCode,
      });
    }
  }, [debouncedSdiCode, fiscalData.is_business, fiscalData.pec_email, requestInvoice, validateField]);

  useEffect(() => {
    if (requestInvoice && debouncedAddress) {
      validateField('billing_address', debouncedAddress, {});
    }
  }, [debouncedAddress, requestInvoice, validateField]);

  useEffect(() => {
    if (requestInvoice && debouncedCity) {
      validateField('billing_city', debouncedCity, {});
    }
  }, [debouncedCity, requestInvoice, validateField]);

  useEffect(() => {
    if (requestInvoice && debouncedProvince) {
      validateField('billing_province', debouncedProvince, {});
    }
  }, [debouncedProvince, requestInvoice, validateField]);

  useEffect(() => {
    if (requestInvoice && debouncedPostalCode) {
      validateField('billing_postal_code', debouncedPostalCode, {});
    }
  }, [debouncedPostalCode, requestInvoice, validateField]);

  // Reset validation when invoice is toggled off
  useEffect(() => {
    if (!requestInvoice) {
      resetValidation();
    }
  }, [requestInvoice, resetValidation]);

  const getFieldState = useCallback((fieldName: keyof typeof validationState) => {
    const state = validationState[fieldName];
    const hasExternalError = errors[`fiscal_data.${fieldName}`];
    
    if (hasExternalError) {
      return { error: hasExternalError, isValid: false };
    }
    
    return { error: state.error, isValid: state.isValid };
  }, [validationState, errors]);

  if (!hostHasVat) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dati Fatturazione (Opzionale)</CardTitle>
        <CardDescription>
          Richiedi fattura elettronica per questa prenotazione
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Toggle fattura */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex-1">
            <Label htmlFor="request-invoice" className="font-medium">
              Richiedo fattura elettronica
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              L'host emetterà fattura elettronica per questa prenotazione
            </p>
          </div>
          <Switch
            id="request-invoice"
            checked={requestInvoice}
            onCheckedChange={onToggleInvoice}
          />
        </div>
        
        {requestInvoice ? (
          <div className="space-y-4 pt-2">
            {/* Tipo contribuente */}
            <div>
              <Label className="mb-3 block">Tipo di contribuente *</Label>
              <RadioGroup
                value={fiscalData.is_business ? 'business' : 'individual'}
                onValueChange={(value) => 
                  onFiscalDataChange({ 
                    ...fiscalData, 
                    is_business: value === 'business',
                    pec_email: value === 'individual' ? '' : fiscalData.pec_email,
                    sdi_code: value === 'individual' ? '' : fiscalData.sdi_code
                  })
                }
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="cursor-pointer flex-1">
                    Privato (CF)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="business" id="business" />
                  <Label htmlFor="business" className="cursor-pointer flex-1">
                    Azienda/P.IVA
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* CF o P.IVA */}
            <div>
              <Label htmlFor="tax-id" className="flex items-center gap-2">
                {fiscalData.is_business ? 'Partita IVA *' : 'Codice Fiscale *'}
                {fiscalData.tax_id && getFieldState('tax_id').isValid && (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
              </Label>
              <div className="relative">
                <Input
                  id="tax-id"
                  value={fiscalData.tax_id}
                  onChange={(e) => onFiscalDataChange({ ...fiscalData, tax_id: e.target.value.toUpperCase() })}
                  placeholder={fiscalData.is_business ? 'IT12345678901' : 'RSSMRA80A01H501U'}
                  className={!getFieldState('tax_id').isValid && fiscalData.tax_id ? 'border-destructive' : ''}
                />
                {!getFieldState('tax_id').isValid && fiscalData.tax_id && (
                  <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-destructive" />
                )}
              </div>
              {getFieldState('tax_id').error && (
                <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {getFieldState('tax_id').error}
                </p>
              )}
            </div>
            
            {/* Campi condizionali P.IVA */}
            {fiscalData.is_business && (
              <>
                <div>
                  <Label htmlFor="pec-email" className="flex items-center gap-2">
                    PEC *
                    {fiscalData.pec_email && getFieldState('pec_email').isValid && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="pec-email"
                      type="email"
                      value={fiscalData.pec_email}
                      onChange={(e) => onFiscalDataChange({ ...fiscalData, pec_email: e.target.value })}
                      placeholder="azienda@pec.it"
                      className={!getFieldState('pec_email').isValid && fiscalData.pec_email ? 'border-destructive' : ''}
                    />
                    {!getFieldState('pec_email').isValid && fiscalData.pec_email && (
                      <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-destructive" />
                    )}
                  </div>
                  {getFieldState('pec_email').error && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {getFieldState('pec_email').error}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="sdi-code" className="flex items-center gap-2">
                    Codice SDI (opzionale)
                    {fiscalData.sdi_code && getFieldState('sdi_code').isValid && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="sdi-code"
                      value={fiscalData.sdi_code}
                      onChange={(e) => onFiscalDataChange({ 
                        ...fiscalData, 
                        sdi_code: e.target.value.toUpperCase() 
                      })}
                      placeholder="XXXXXXX"
                      maxLength={7}
                      className={!getFieldState('sdi_code').isValid && fiscalData.sdi_code ? 'border-destructive' : ''}
                    />
                    {!getFieldState('sdi_code').isValid && fiscalData.sdi_code && (
                      <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Richiesto almeno uno tra PEC o Codice SDI
                  </p>
                  {getFieldState('sdi_code').error && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {getFieldState('sdi_code').error}
                    </p>
                  )}
                </div>
              </>
            )}
            
            {/* Indirizzo fatturazione */}
            <div>
              <Label htmlFor="billing-address" className="flex items-center gap-2">
                Indirizzo Fatturazione *
                {fiscalData.billing_address && getFieldState('billing_address').isValid && (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
              </Label>
              <div className="relative">
                <Input
                  id="billing-address"
                  value={fiscalData.billing_address}
                  onChange={(e) => onFiscalDataChange({ ...fiscalData, billing_address: e.target.value })}
                  placeholder="Via Roma 1"
                  className={!getFieldState('billing_address').isValid && fiscalData.billing_address ? 'border-destructive' : ''}
                />
                {!getFieldState('billing_address').isValid && fiscalData.billing_address && (
                  <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-destructive" />
                )}
              </div>
              {getFieldState('billing_address').error && (
                <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {getFieldState('billing_address').error}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="billing-city" className="flex items-center gap-2">
                  Città *
                  {fiscalData.billing_city && getFieldState('billing_city').isValid && (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="billing-city"
                    value={fiscalData.billing_city}
                    onChange={(e) => onFiscalDataChange({ ...fiscalData, billing_city: e.target.value })}
                    placeholder="Milano"
                    className={!getFieldState('billing_city').isValid && fiscalData.billing_city ? 'border-destructive' : ''}
                  />
                  {!getFieldState('billing_city').isValid && fiscalData.billing_city && (
                    <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-destructive" />
                  )}
                </div>
                {getFieldState('billing_city').error && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {getFieldState('billing_city').error}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="billing-province" className="flex items-center gap-2">
                  Provincia *
                  {fiscalData.billing_province && getFieldState('billing_province').isValid && (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="billing-province"
                    value={fiscalData.billing_province}
                    onChange={(e) => onFiscalDataChange({ 
                      ...fiscalData, 
                      billing_province: e.target.value.toUpperCase() 
                    })}
                    maxLength={2}
                    placeholder="MI"
                    className={!getFieldState('billing_province').isValid && fiscalData.billing_province ? 'border-destructive' : ''}
                  />
                  {!getFieldState('billing_province').isValid && fiscalData.billing_province && (
                    <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-destructive" />
                  )}
                </div>
                {getFieldState('billing_province').error && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {getFieldState('billing_province').error}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="billing-postal-code" className="flex items-center gap-2">
                  CAP *
                  {fiscalData.billing_postal_code && getFieldState('billing_postal_code').isValid && (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="billing-postal-code"
                    value={fiscalData.billing_postal_code}
                    onChange={(e) => onFiscalDataChange({ 
                      ...fiscalData, 
                      billing_postal_code: e.target.value 
                    })}
                    maxLength={5}
                    placeholder="20100"
                    className={!getFieldState('billing_postal_code').isValid && fiscalData.billing_postal_code ? 'border-destructive' : ''}
                  />
                  {!getFieldState('billing_postal_code').isValid && fiscalData.billing_postal_code && (
                    <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-destructive" />
                  )}
                </div>
                {getFieldState('billing_postal_code').error && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {getFieldState('billing_postal_code').error}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Ricevuta Non Fiscale</AlertTitle>
            <AlertDescription>
              Riceverai una ricevuta non fiscale per questa prenotazione, 
              valida per tracciabilità della transazione ma non deducibile ai fini fiscali.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
