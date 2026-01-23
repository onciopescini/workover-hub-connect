import { format, parseISO, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckCircle, Download } from 'lucide-react';
import { useConfirmInvoiceIssued } from '@/hooks/mutations/useConfirmInvoiceIssued';
import { resolveBookingCoworker, resolveBookingSpace } from '@/lib/booking-mappers';
import type { PaymentWithBooking } from '@/types/payment';

interface CoworkerFiscalData {
  tax_id: string;
  is_business: boolean;
  pec_email?: string;
  sdi_code?: string;
  billing_address: string;
  billing_city: string;
  billing_province: string;
  billing_postal_code: string;
}

interface InvoiceBooking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  stripe_connected?: boolean;
}

interface InvoiceCardProps {
  payment: PaymentWithBooking;
}

export function InvoiceCard({ payment }: InvoiceCardProps) {
  const { mutate: confirmIssued, isPending } = useConfirmInvoiceIssued();
  
  const booking = payment.booking as InvoiceBooking | null;
  const bookingRecord = payment.booking && typeof payment.booking === 'object'
    ? (payment.booking as Record<string, unknown>)
    : null;
  const coworker = bookingRecord ? resolveBookingCoworker(bookingRecord) : null;
  const space = bookingRecord ? resolveBookingSpace(bookingRecord) : null;

  // Fiscal data would come from booking metadata when available
  const fiscalData = undefined as CoworkerFiscalData | undefined;

  const deadline = payment.host_invoice_deadline ? new Date(payment.host_invoice_deadline) : null;
  const daysRemaining = deadline ? differenceInDays(deadline, new Date()) : 0;
  const isExpired = daysRemaining < 0;

  const handleDownloadGuide = () => {
    // Generate a simple PDF summary
    const summaryText = `
RIEPILOGO FATTURA DA EMETTERE

Cliente: ${coworker?.first_name} ${coworker?.last_name}
Email: ${coworker?.email}

Dati Fiscali:
${fiscalData?.is_business ? 'P.IVA' : 'CF'}: ${fiscalData?.tax_id}
${fiscalData?.pec_email ? `PEC: ${fiscalData.pec_email}` : ''}
${fiscalData?.sdi_code ? `Codice SDI: ${fiscalData.sdi_code}` : ''}
Indirizzo: ${fiscalData?.billing_address}, ${fiscalData?.billing_city} (${fiscalData?.billing_province}) ${fiscalData?.billing_postal_code}

Servizio Erogato:
Spazio: ${space?.name || space?.title}
Data: ${booking?.booking_date ? format(parseISO(booking.booking_date), 'dd MMMM yyyy', { locale: it }) : ''}
Orario: ${booking?.start_time ? format(parseISO(booking.start_time), 'HH:mm') : ''} - ${booking?.end_time ? format(parseISO(booking.end_time), 'HH:mm') : ''}

Importo da Fatturare: €${(payment.host_amount || 0).toFixed(2)}
(Canone netto ricevuto da WorkOver)

Scadenza: ${deadline ? format(deadline, 'dd MMMM yyyy', { locale: it }) : 'N/A'}
    `.trim();

    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fattura_${payment.id.slice(0, 8)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Fattura #{payment.id.slice(0, 8)}</CardTitle>
            <CardDescription>
              {space?.name || space?.title} - {booking?.booking_date ? format(parseISO(booking.booking_date), 'dd MMMM yyyy', { locale: it }) : 'Data non disponibile'}
            </CardDescription>
          </div>
          <Badge variant={isExpired ? 'destructive' : 'default'}>
            {isExpired ? 'SCADUTA' : `Scadenza: ${daysRemaining} giorni`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Cliente */}
          <div>
            <Label className="text-sm font-medium">Cliente</Label>
            <p className="text-base">{coworker?.first_name} {coworker?.last_name}</p>
            <p className="text-sm text-muted-foreground">{coworker?.email}</p>
          </div>

          {/* Dati Fiscali Cliente */}
          {fiscalData && (
            <div>
              <Label className="text-sm font-medium">Dati Fiscali Cliente</Label>
              <div className="space-y-1">
                <p className="text-sm">
                  {fiscalData.is_business ? 'P.IVA' : 'CF'}: <span className="font-mono">{fiscalData.tax_id}</span>
                </p>
                {fiscalData.pec_email && (
                  <p className="text-sm">PEC: {fiscalData.pec_email}</p>
                )}
                {fiscalData.sdi_code && (
                  <p className="text-sm">Codice SDI: <span className="font-mono">{fiscalData.sdi_code}</span></p>
                )}
                <p className="text-sm">
                  {fiscalData.billing_address}, {fiscalData.billing_city} ({fiscalData.billing_province}) {fiscalData.billing_postal_code}
                </p>
              </div>
            </div>
          )}

          {/* Importo */}
          <div>
            <Label className="text-sm font-medium">Importo da Fatturare</Label>
            <p className="text-3xl font-bold">€ {(payment.host_amount || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              (Canone netto ricevuto da WorkOver)
            </p>
          </div>

          {/* Dettagli Servizio */}
          <div>
            <Label className="text-sm font-medium">Servizio Erogato</Label>
            <p className="text-sm">
              {booking?.start_time && booking?.end_time 
                ? `${format(parseISO(booking.start_time), 'HH:mm')} - ${format(parseISO(booking.end_time), 'HH:mm')}`
                : 'Orario non disponibile'}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={handleDownloadGuide}
          className="flex-1"
        >
          <Download className="mr-2 h-4 w-4" />
          Scarica Riepilogo
        </Button>
        <Button 
          onClick={() => confirmIssued(payment.id)}
          disabled={isPending}
          className="flex-1"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Conferma Emessa
        </Button>
      </CardFooter>
    </Card>
  );
}
