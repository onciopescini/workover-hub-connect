import { format, parseISO, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useConfirmCreditNoteIssued } from '@/hooks/mutations/useConfirmCreditNoteIssued';
import { resolveBookingCoworker, resolveBookingSpace } from '@/lib/booking-mappers';
import type { PaymentWithBooking } from '@/types/payment';

interface CreditNoteCardProps {
  payment: PaymentWithBooking;
}

export function CreditNoteCard({ payment }: CreditNoteCardProps) {
  const { mutate: confirmIssued, isPending } = useConfirmCreditNoteIssued();
  
  const booking = payment.booking;
  const bookingRecord = booking && typeof booking === 'object' ? booking : null;
  const coworker = bookingRecord ? resolveBookingCoworker(bookingRecord) : null;
  const space = bookingRecord ? resolveBookingSpace(bookingRecord) : null;

  const deadline = payment.credit_note_deadline ? new Date(payment.credit_note_deadline) : null;
  const daysRemaining = deadline ? differenceInDays(deadline, new Date()) : 0;
  const isExpired = daysRemaining < 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Nota di Credito #{payment.id.slice(0, 8)}</CardTitle>
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
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Questa prenotazione è stata cancellata dopo l'emissione della fattura. È necessario emettere una nota di credito.
            </AlertDescription>
          </Alert>

          {/* Cliente */}
          <div>
            <Label className="text-sm font-medium">Cliente</Label>
            <p className="text-base">{coworker?.first_name} {coworker?.last_name}</p>
          </div>

          {/* Motivo Cancellazione */}
          {booking?.cancellation_reason && (
            <div>
              <Label className="text-sm font-medium">Motivo Cancellazione</Label>
              <p className="text-sm text-muted-foreground">{booking.cancellation_reason}</p>
            </div>
          )}

          {/* Data Cancellazione */}
          {booking?.cancelled_at && (
            <div>
              <Label className="text-sm font-medium">Cancellata il</Label>
              <p className="text-sm">{format(parseISO(booking.cancelled_at), 'dd MMMM yyyy HH:mm', { locale: it })}</p>
            </div>
          )}

          {/* Importo */}
          <div>
            <Label className="text-sm font-medium">Importo Nota di Credito</Label>
            <p className="text-3xl font-bold">€ {(payment.host_amount || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              Storno canone per cancellazione
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          onClick={() => confirmIssued(payment.id)}
          disabled={isPending}
          className="w-full"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Conferma NC Emessa
        </Button>
      </CardFooter>
    </Card>
  );
}
