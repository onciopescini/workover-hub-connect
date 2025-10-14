import { TaxDetails } from '@/types/fiscal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, User, MapPin, CreditCard } from 'lucide-react';
import { formatIBAN } from '@/schemas/fiscalSchema';

interface TaxDetailsDisplayProps {
  taxDetails: TaxDetails;
  showActions?: boolean;
}

export const TaxDetailsDisplay = ({ taxDetails, showActions = false }: TaxDetailsDisplayProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {taxDetails.entity_type === 'business' ? (
              <Building2 className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
            Dati Fiscali
          </CardTitle>
          {taxDetails.is_primary && (
            <Badge variant="default">Principale</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Tipo Entità</p>
            <p className="font-medium">
              {taxDetails.entity_type === 'business' ? 'Azienda' : 'Persona Fisica'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Codice Fiscale / P.IVA</p>
            <p className="font-medium">{taxDetails.tax_id}</p>
          </div>

          {taxDetails.vat_number && (
            <div>
              <p className="text-sm text-muted-foreground">Partita IVA</p>
              <p className="font-medium">{taxDetails.vat_number}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground">Paese</p>
            <p className="font-medium">{taxDetails.country_code}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Indirizzo</p>
              <p className="font-medium">{taxDetails.address_line1}</p>
              {taxDetails.address_line2 && (
                <p className="text-sm">{taxDetails.address_line2}</p>
              )}
              <p className="text-sm">
                {taxDetails.postal_code} {taxDetails.city}
                {taxDetails.province && ` (${taxDetails.province})`}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <CreditCard className="h-4 w-4 mt-1 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">IBAN</p>
              <p className="font-mono text-sm">{formatIBAN(taxDetails.iban)}</p>
              {taxDetails.bic_swift && (
                <p className="text-sm text-muted-foreground mt-1">
                  BIC/SWIFT: {taxDetails.bic_swift}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          <p>Valido dal: {new Date(taxDetails.valid_from).toLocaleDateString('it-IT')}</p>
          {taxDetails.valid_to && (
            <p>Valido fino al: {new Date(taxDetails.valid_to).toLocaleDateString('it-IT')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
