
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { BookingWithDetails } from "@/types/booking";
import { Calendar, MapPin, User, MessageSquare, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from "@/types/booking";
import { ReviewButton } from "./ReviewButton";

interface BookingCardProps {
  booking: BookingWithDetails;
  userRole: "host" | "coworker";
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
}

export const BookingCard = ({ 
  booking, 
  userRole, 
  onOpenMessageDialog, 
  onOpenCancelDialog 
}: BookingCardProps) => {
  const getOtherParty = () => {
    if (userRole === "host") {
      // Show coworker info
      return {
        id: booking.user_id,
        name: `${booking.coworker?.first_name || ''} ${booking.coworker?.last_name || ''}`.trim() || 'Coworker',
        photo: booking.coworker?.profile_photo_url,
        role: "Coworker"
      };
    } else {
      // For coworker view, show host info
      return {
        id: booking.space?.host_id || '',
        name: booking.space?.title || "Spazio",
        photo: null,
        role: "Host"
      };
    }
  };

  const canCancelBooking = () => {
    return booking.status === "confirmed" || booking.status === "pending";
  };

  const otherParty = getOtherParty();
  const formattedDate = format(new Date(booking.booking_date), "EEEE d MMMM yyyy", { locale: it });

  return (
    <Card className="hover:shadow-md transition-shadow">
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
          <Badge className={BOOKING_STATUS_COLORS[booking.status as keyof typeof BOOKING_STATUS_COLORS]}>
            {BOOKING_STATUS_LABELS[booking.status as keyof typeof BOOKING_STATUS_LABELS]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={otherParty.photo || undefined} />
              <AvatarFallback>
                <User className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900">{otherParty.name}</p>
              <p className="text-sm text-gray-600">{otherParty.role}</p>
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
            <p className="text-xs text-gray-500">
              Tu sei: {userRole === "host" ? "Host" : "Coworker"}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={() => onOpenMessageDialog(booking.id, booking.space?.title || "Spazio")}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Messaggi
          </Button>
          
          {/* Review button - only show for completed bookings */}
          {booking.status === 'confirmed' && otherParty.id && (
            <ReviewButton
              booking={booking}
              targetUserId={otherParty.id}
              targetUserName={otherParty.name}
            />
          )}
          
          {canCancelBooking() && (
            <Button
              variant="destructive"
              size="sm"
              className="flex items-center"
              onClick={() => onOpenCancelDialog(booking)}
            >
              <X className="w-4 h-4 mr-1" />
              Cancella
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
