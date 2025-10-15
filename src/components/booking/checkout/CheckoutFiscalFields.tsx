import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

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
              <Label htmlFor="tax-id">
                {fiscalData.is_business ? 'Partita IVA *' : 'Codice Fiscale *'}
              </Label>
              <Input
                id="tax-id"
                value={fiscalData.tax_id}
                onChange={(e) => onFiscalDataChange({ ...fiscalData, tax_id: e.target.value.toUpperCase() })}
                placeholder={fiscalData.is_business ? 'IT12345678901' : 'RSSMRA80A01H501U'}
                className={errors['fiscal_data.tax_id'] ? 'border-destructive' : ''}
              />
              {errors['fiscal_data.tax_id'] && (
                <p className="text-sm text-destructive mt-1">{errors['fiscal_data.tax_id']}</p>
              )}
            </div>
            
            {/* Campi condizionali P.IVA */}
            {fiscalData.is_business && (
              <>
                <div>
                  <Label htmlFor="pec-email">PEC *</Label>
                  <Input
                    id="pec-email"
                    type="email"
                    value={fiscalData.pec_email}
                    onChange={(e) => onFiscalDataChange({ ...fiscalData, pec_email: e.target.value })}
                    placeholder="azienda@pec.it"
                    className={errors['fiscal_data.pec_email'] ? 'border-destructive' : ''}
                  />
                  {errors['fiscal_data.pec_email'] && (
                    <p className="text-sm text-destructive mt-1">{errors['fiscal_data.pec_email']}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="sdi-code">Codice SDI (opzionale)</Label>
                  <Input
                    id="sdi-code"
                    value={fiscalData.sdi_code}
                    onChange={(e) => onFiscalDataChange({ 
                      ...fiscalData, 
                      sdi_code: e.target.value.toUpperCase() 
                    })}
                    placeholder="XXXXXXX"
                    maxLength={7}
                    className={errors['fiscal_data.sdi_code'] ? 'border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Richiesto almeno uno tra PEC o Codice SDI
                  </p>
                  {errors['fiscal_data.sdi_code'] && (
                    <p className="text-sm text-destructive mt-1">{errors['fiscal_data.sdi_code']}</p>
                  )}
                </div>
              </>
            )}
            
            {/* Indirizzo fatturazione */}
            <div>
              <Label htmlFor="billing-address">Indirizzo Fatturazione *</Label>
              <Input
                id="billing-address"
                value={fiscalData.billing_address}
                onChange={(e) => onFiscalDataChange({ ...fiscalData, billing_address: e.target.value })}
                placeholder="Via Roma 1"
                className={errors['fiscal_data.billing_address'] ? 'border-destructive' : ''}
              />
              {errors['fiscal_data.billing_address'] && (
                <p className="text-sm text-destructive mt-1">{errors['fiscal_data.billing_address']}</p>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="billing-city">Città *</Label>
                <Input
                  id="billing-city"
                  value={fiscalData.billing_city}
                  onChange={(e) => onFiscalDataChange({ ...fiscalData, billing_city: e.target.value })}
                  placeholder="Milano"
                  className={errors['fiscal_data.billing_city'] ? 'border-destructive' : ''}
                />
                {errors['fiscal_data.billing_city'] && (
                  <p className="text-sm text-destructive mt-1">{errors['fiscal_data.billing_city']}</p>
                )}
              </div>
              <div>
                <Label htmlFor="billing-province">Provincia *</Label>
                <Input
                  id="billing-province"
                  value={fiscalData.billing_province}
                  onChange={(e) => onFiscalDataChange({ 
                    ...fiscalData, 
                    billing_province: e.target.value.toUpperCase() 
                  })}
                  maxLength={2}
                  placeholder="MI"
                  className={errors['fiscal_data.billing_province'] ? 'border-destructive' : ''}
                />
                {errors['fiscal_data.billing_province'] && (
                  <p className="text-sm text-destructive mt-1">{errors['fiscal_data.billing_province']}</p>
                )}
              </div>
              <div>
                <Label htmlFor="billing-postal-code">CAP *</Label>
                <Input
                  id="billing-postal-code"
                  value={fiscalData.billing_postal_code}
                  onChange={(e) => onFiscalDataChange({ 
                    ...fiscalData, 
                    billing_postal_code: e.target.value 
                  })}
                  maxLength={5}
                  placeholder="20100"
                  className={errors['fiscal_data.billing_postal_code'] ? 'border-destructive' : ''}
                />
                {errors['fiscal_data.billing_postal_code'] && (
                  <p className="text-sm text-destructive mt-1">{errors['fiscal_data.billing_postal_code']}</p>
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
