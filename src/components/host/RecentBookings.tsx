
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookingWithDetails, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from "@/types/booking";
import { Calendar, MapPin, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useLogger } from "@/hooks/useLogger";

interface RecentBookingsProps {
  bookings: BookingWithDetails[];
  onBookingUpdate?: () => void;
}

export function RecentBookings({ bookings, onBookingUpdate }: RecentBookingsProps) {
  const { error: logError } = useLogger({ context: 'RecentBookings' });
  const [loadingBookings, setLoadingBookings] = useState<Set<string>>(new Set());

  const handleBookingAction = async (bookingId: string, action: 'confirm' | 'reject') => {
    setLoadingBookings(prev => new Set(prev).add(bookingId));

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: action === 'confirm' ? 'confirmed' : 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success(
        action === 'confirm' 
          ? 'Prenotazione confermata!' 
          : 'Prenotazione respinta'
      );

      if (onBookingUpdate) {
        onBookingUpdate();
      }
    } catch (error) {
      logError('Error updating booking', error as Error, {
        operation: 'update_booking',
        bookingId,
        action
      });
      toast.error('Errore nell\'aggiornamento della prenotazione');
    } finally {
      setLoadingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prenotazioni Recenti</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            Nessuna prenotazione recente
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prenotazioni Recenti</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookings.slice(0, 5).map((booking) => (
          <div key={booking.id} className="flex items-center space-x-4 p-3 rounded-lg border">
            <Avatar className="h-10 w-10">
              <AvatarImage src={booking.coworker?.profile_photo_url || undefined} />
              <AvatarFallback>
                {booking.coworker?.first_name?.[0]}{booking.coworker?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium truncate">
                  {booking.coworker?.first_name} {booking.coworker?.last_name}
                </p>
                <Badge className={BOOKING_STATUS_COLORS[booking.status]}>
                  {BOOKING_STATUS_LABELS[booking.status]}
                </Badge>
              </div>
              
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(booking.booking_date).toLocaleDateString('it-IT')}
                <MapPin className="w-3 h-3 ml-2 mr-1" />
                <span className="truncate">{booking.space?.title}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              {booking.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBookingAction(booking.id, 'confirm')}
                    disabled={loadingBookings.has(booking.id)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBookingAction(booking.id, 'reject')}
                    disabled={loadingBookings.has(booking.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </>
              )}
              {booking.status !== 'pending' && (
                <Button variant="outline" size="sm" className="text-indigo-600 hover:text-indigo-700">
                  Dettagli
                </Button>
              )}
            </div>
          </div>
        ))}
        
        {bookings.length > 5 && (
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm" className="text-indigo-600">
              Vedi tutte le prenotazioni ({bookings.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
