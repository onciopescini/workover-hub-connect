import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taxDetailsSchema, type TaxDetailsFormData } from '@/schemas/fiscalSchema';
import { useTaxDetails } from '@/hooks/fiscal/useTaxDetails';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2 } from 'lucide-react';

export const TaxDetailsForm = () => {
  const { createTaxDetails, isCreating } = useTaxDetails();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<TaxDetailsFormData>({
    resolver: zodResolver(taxDetailsSchema),
    defaultValues: {
      country_code: 'IT',
      entity_type: 'individual'
    }
  });

  const entityType = watch('entity_type');

  const onSubmit = async (data: TaxDetailsFormData) => {
    const input = {
      ...data,
      vat_number: data.vat_number || null,
      address_line2: data.address_line2 || null,
      province: data.province || null,
      bic_swift: data.bic_swift || null
    };
    await createTaxDetails(input);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dati Fiscali</CardTitle>
        <CardDescription>
          Inserisci i tuoi dati fiscali per la gestione delle fatture e dei report DAC7
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity_type">Tipo Entità *</Label>
              <Select
                value={entityType}
                onValueChange={(value) => setValue('entity_type', value as 'individual' | 'business')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Persona Fisica</SelectItem>
                  <SelectItem value="business">Azienda</SelectItem>
                </SelectContent>
              </Select>
              {errors.entity_type && (
                <p className="text-sm text-destructive">{errors.entity_type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country_code">Codice Paese *</Label>
              <Input
                id="country_code"
                {...register('country_code')}
                placeholder="IT"
                maxLength={2}
              />
              {errors.country_code && (
                <p className="text-sm text-destructive">{errors.country_code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_id">Codice Fiscale / P.IVA *</Label>
              <Input
                id="tax_id"
                {...register('tax_id')}
                placeholder={entityType === 'business' ? '12345678901' : 'RSSMRA80A01H501U'}
              />
              {errors.tax_id && (
                <p className="text-sm text-destructive">{errors.tax_id.message}</p>
              )}
            </div>

            {entityType === 'business' && (
              <div className="space-y-2">
                <Label htmlFor="vat_number">Partita IVA</Label>
                <Input
                  id="vat_number"
                  {...register('vat_number')}
                  placeholder="12345678901"
                />
                {errors.vat_number && (
                  <p className="text-sm text-destructive">{errors.vat_number.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Indirizzo</h3>
            
            <div className="space-y-2">
              <Label htmlFor="address_line1">Indirizzo *</Label>
              <Input
                id="address_line1"
                {...register('address_line1')}
                placeholder="Via Roma, 123"
              />
              {errors.address_line1 && (
                <p className="text-sm text-destructive">{errors.address_line1.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line2">Indirizzo (riga 2)</Label>
              <Input
                id="address_line2"
                {...register('address_line2')}
                placeholder="Interno 5"
              />
              {errors.address_line2 && (
                <p className="text-sm text-destructive">{errors.address_line2.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Città *</Label>
                <Input
                  id="city"
                  {...register('city')}
                  placeholder="Milano"
                />
                {errors.city && (
                  <p className="text-sm text-destructive">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Input
                  id="province"
                  {...register('province')}
                  placeholder="MI"
                  maxLength={2}
                />
                {errors.province && (
                  <p className="text-sm text-destructive">{errors.province.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code">CAP *</Label>
                <Input
                  id="postal_code"
                  {...register('postal_code')}
                  placeholder="20100"
                />
                {errors.postal_code && (
                  <p className="text-sm text-destructive">{errors.postal_code.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Dati Bancari</h3>
            
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN *</Label>
              <Input
                id="iban"
                {...register('iban')}
                placeholder="IT60 X054 2811 1010 0000 0123 456"
              />
              {errors.iban && (
                <p className="text-sm text-destructive">{errors.iban.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bic_swift">BIC/SWIFT</Label>
              <Input
                id="bic_swift"
                {...register('bic_swift')}
                placeholder="BCITITMM"
              />
              {errors.bic_swift && (
                <p className="text-sm text-destructive">{errors.bic_swift.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salva Dati Fiscali
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
