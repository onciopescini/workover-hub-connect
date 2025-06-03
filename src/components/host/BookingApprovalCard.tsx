
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookingWithDetails } from "@/types/booking";
import { Calendar, MapPin, CheckCircle, XCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface BookingApprovalCardProps {
  booking: BookingWithDetails;
  onApprovalUpdate: () => void;
}

export const BookingApprovalCard = ({ booking, onApprovalUpdate }: BookingApprovalCardProps) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      // Update booking status to confirmed
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
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
          content: `La tua prenotazione presso "${booking.space?.title}" è stata approvata dall'host. Buon lavoro!`,
          metadata: {
            booking_id: booking.id,
            space_title: booking.space?.title,
            action: 'approved'
          }
        });

      toast.success('Prenotazione approvata con successo!');
      onApprovalUpdate();
    } catch (error) {
      console.error('Error approving booking:', error);
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
          content: `La tua richiesta di prenotazione presso "${booking.space?.title}" è stata rifiutata dall'host.`,
          metadata: {
            booking_id: booking.id,
            space_title: booking.space?.title,
            action: 'rejected'
          }
        });

      toast.success('Prenotazione rifiutata');
      onApprovalUpdate();
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast.error('Errore nel rifiuto della prenotazione');
    } finally {
      setIsRejecting(false);
    }
  };

  const formattedDate = format(new Date(booking.booking_date), "EEEE d MMMM yyyy", { locale: it });

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {booking.space?.title || 'Spazio senza titolo'}
            </CardTitle>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              {booking.space?.address || 'Indirizzo non disponibile'}
            </div>
          </div>
          <Badge className="bg-orange-100 text-orange-800">
            Richiede Approvazione
          </Badge>
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
              <p className="font-medium text-gray-900">
                {booking.coworker?.first_name} {booking.coworker?.last_name}
              </p>
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
  );
};
