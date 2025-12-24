import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, Clock, User, Home, CreditCard, MessageSquare } from "lucide-react";
import { BOOKING_STATUS_LABELS } from "@/types/booking";
import { RefundProcessor } from "./RefundProcessor";

interface BookingDetailModalProps {
  bookingId: string;
  open: boolean;
  onClose: () => void;
}

export function BookingDetailModal({ bookingId, open, onClose }: BookingDetailModalProps) {
  const { data: booking, isLoading } = useQuery({
    queryKey: ['admin-booking-detail', bookingId],
    queryFn: async () => {
      // Fetch booking details
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          coworker:profiles!bookings_user_id_fkey(id, first_name, last_name, profile_photo_url),
          payments(id, amount, payment_status, method, receipt_url, stripe_session_id, created_at)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      // Fetch space details separately (to handle workspaces vs spaces transition)
      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .select('id, name, address, host_id, price_per_day')
        .eq('id', bookingData.space_id)
        .single();

      if (spaceError) throw spaceError;

      // Transform data to match UI expectations
      return {
        ...bookingData,
        coworker: Array.isArray(bookingData.coworker) ? bookingData.coworker[0] : bookingData.coworker,
        space: {
          id: spaceData.id,
          // Correctly map workspace 'name' to 'title' but also keep 'name' available
          // Fixes the discrepancy between legacy 'spaces' usage and 'workspaces'
          title: spaceData.name,
          name: spaceData.name,
          address: spaceData.address,
          host_id: spaceData.host_id,
          price_per_day: spaceData.price_per_day
        }
      };
    },
    enabled: open
  });

  if (isLoading || !booking) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Caricamento...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const payment = booking.payments?.[0];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Dettagli Prenotazione
            <Badge variant={booking.status === 'cancelled' ? 'destructive' : 'secondary'}>
              {BOOKING_STATUS_LABELS[booking.status as keyof typeof BOOKING_STATUS_LABELS] || booking.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Informazioni Prenotazione
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data Prenotazione</p>
                  <p className="font-medium">
                    {format(new Date(booking.booking_date + 'T00:00:00'), "dd MMMM yyyy", { locale: it })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Orario</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {booking.start_time} - {booking.end_time}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Numero Ospiti</p>
                  <p className="font-medium">{booking.guests_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Creata il</p>
                  <p className="font-medium">
                    {booking.created_at ? format(new Date(booking.created_at), "dd/MM/yyyy HH:mm", { locale: it }) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User & Space Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Utente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">
                  {booking.coworker?.first_name} {booking.coworker?.last_name}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Spazio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Robustly handle title/name property */}
                <p className="font-medium">{booking.space?.title || booking.space?.name}</p>
                <p className="text-sm text-muted-foreground">{booking.space?.address}</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Info */}
          {payment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Importo</p>
                    <p className="font-medium text-lg">€{payment.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stato</p>
                    <Badge variant={payment.payment_status === 'failed' ? 'destructive' : 'secondary'}>
                      {payment.payment_status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Metodo</p>
                    <p className="font-medium">{payment.method || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Pagamento</p>
                    <p className="font-medium">
                      {payment.created_at ? format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: it }) : 'N/A'}
                    </p>
                  </div>
                </div>
                {payment.stripe_session_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">Stripe Session ID</p>
                    <p className="font-mono text-xs">{payment.stripe_session_id}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cancellation Info */}
          {booking.cancelled_at && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">Cancellazione</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Cancellata il</p>
                  <p className="font-medium">
                    {format(new Date(booking.cancelled_at), "dd/MM/yyyy HH:mm", { locale: it })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cancellata da</p>
                  <p className="font-medium">
                    {booking.cancelled_by_host ? 'Host' : 'Utente'}
                  </p>
                </div>
                {booking.cancellation_reason && (
                  <div>
                    <p className="text-sm text-muted-foreground">Motivo</p>
                    <p className="font-medium">{booking.cancellation_reason}</p>
                  </div>
                )}
                {booking.cancellation_fee && (
                  <div>
                    <p className="text-sm text-muted-foreground">Fee di Cancellazione</p>
                    <p className="font-medium">€{booking.cancellation_fee.toFixed(2)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}


          {/* Refund Processor */}
          {payment && payment.payment_status === 'completed' && booking.status !== 'cancelled' && (
            <>
              <Separator />
              <RefundProcessor paymentId={payment.id} bookingId={booking.id} amount={payment.amount} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
