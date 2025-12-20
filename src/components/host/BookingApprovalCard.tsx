
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookingWithDetails } from "@/types/booking";
import { Calendar, MapPin, CheckCircle, XCircle, User, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useLogger } from "@/hooks/useLogger";
import { ProfilePreviewDialog } from "@/components/networking/ProfilePreviewDialog";

interface BookingApprovalCardProps {
  booking: BookingWithDetails;
  onApprovalUpdate: () => void;
}

export const BookingApprovalCard = ({ booking, onApprovalUpdate }: BookingApprovalCardProps) => {
  const { error: logError } = useLogger({ context: 'BookingApprovalCard' });
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      // Calcola payment_deadline: 2h da ora
      const paymentDeadline = new Date();
      paymentDeadline.setHours(paymentDeadline.getHours() + 2);

      // Update booking status to pending_payment
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          status: 'pending_payment',
          payment_deadline: paymentDeadline.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Send notification to coworker
      await supabase
        .from('user_notifications')
        .insert({
          user_id: booking.user_id,
          type: 'booking',
          title: 'Prenotazione approvata!',
          content: `La tua prenotazione presso "${booking.workspaces?.name}" è stata approvata dall'host. Completa il pagamento entro 2h per confermare!`,
          metadata: {
            booking_id: booking.id,
            space_title: booking.workspaces?.name,
            action: 'approved',
            payment_deadline: paymentDeadline.toISOString()
          }
        });

      toast.success('Prenotazione approvata! Il coworker ha 2h per completare il pagamento.');
      onApprovalUpdate();
    } catch (error) {
      logError('Error approving booking', error as Error, {
        operation: 'approve_booking',
        bookingId: booking.id,
        spaceTitle: booking.space?.title
      });
      toast.error('Errore nell\'approvazione della prenotazione');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      // Update booking status to cancelled
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancelled_by_host: true,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Richiesta rifiutata dall\'host',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Send notification to coworker
      await supabase
        .from('user_notifications')
        .insert({
          user_id: booking.user_id,
          type: 'booking',
          title: 'Prenotazione rifiutata',
          content: `La tua richiesta di prenotazione presso "${booking.workspaces?.name}" è stata rifiutata dall'host.`,
          metadata: {
            booking_id: booking.id,
            space_title: booking.workspaces?.name,
            action: 'rejected'
          }
        });

      toast.success('Prenotazione rifiutata');
      onApprovalUpdate();
    } catch (error) {
      logError('Error rejecting booking', error as Error, {
        operation: 'reject_booking',
        bookingId: booking.id,
        spaceTitle: booking.space?.title
      });
      toast.error('Errore nel rifiuto della prenotazione');
    } finally {
      setIsRejecting(false);
    }
  };

  const formattedDate = format(new Date(booking.booking_date), "EEEE d MMMM yyyy", { locale: it });

  return (
    <>
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-gray-900">
                {booking.workspaces?.name || 'Spazio senza titolo'}
              </CardTitle>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <MapPin className="w-4 h-4 mr-1" />
                {booking.workspaces?.address || 'Indirizzo non disponibile'}
              </div>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-orange-100 text-orange-800">
                Richiede Approvazione
              </Badge>
              {booking.is_urgent && (
                <Badge className="bg-red-100 text-red-800 animate-pulse">
                  <Clock className="w-3 h-3 mr-1" />
                  Scade tra 2h
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={booking.coworker?.profile_photo_url || undefined} />
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <button
                  onClick={() => setShowProfilePreview(true)}
                  className="font-medium text-gray-900 hover:text-primary hover:underline transition-colors text-left"
                >
                  {booking.coworker?.first_name} {booking.coworker?.last_name}
                </button>
                <p className="text-sm text-gray-600">Coworker</p>
              </div>
            </div>

          <div className="text-right">
            <div className="flex items-center text-sm text-gray-600 mb-1">
              <Calendar className="w-4 h-4 mr-1" />
              {formattedDate}
            </div>
            {booking.start_time && booking.end_time && (
              <p className="text-xs text-gray-500">
                {booking.start_time} - {booking.end_time}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {isApproving ? (
              "Approvando..."
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Approva
              </>
            )}
          </Button>
          
          <Button
            onClick={handleReject}
            disabled={isApproving || isRejecting}
            variant="destructive"
            className="flex-1"
          >
            {isRejecting ? (
              "Rifiutando..."
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-1" />
                Rifiuta
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>

    <ProfilePreviewDialog
      open={showProfilePreview}
      onOpenChange={setShowProfilePreview}
      userId={booking.user_id}
    />
    </>
  );
};
