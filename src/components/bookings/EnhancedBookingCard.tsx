
import { format, parseISO, isBefore, addMinutes } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { it } from "date-fns/locale";
import { utcToLocal, isDateInPast, parseBookingDateTime, formatBookingDateTime, formatUtcDateForDisplay } from "@/lib/date-utils";
import { canCancelBooking } from "@/lib/booking-datetime-utils";
import { BookingWithDetails } from "@/types/booking";
import { Calendar, MapPin, User, MessageSquare, X, Clock, Shield, Euro } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from "@/types/booking";
import { ReviewButton } from "./ReviewButton";
import { MessagesButton } from "@/components/messaging/MessagesButton";

interface EnhancedBookingCardProps {
  booking: BookingWithDetails;
  userRole: "host" | "coworker";
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
  isChatEnabled?: boolean;
}

export const EnhancedBookingCard = ({ 
  booking, 
  userRole, 
  onOpenMessageDialog, 
  onOpenCancelDialog,
  isChatEnabled = false
}: EnhancedBookingCardProps) => {
  const getOtherParty = () => {
    if (userRole === "host") {
      return {
        id: booking.user_id,
        name: `${booking.coworker?.first_name || ''} ${booking.coworker?.last_name || ''}`.trim() || 'Coworker',
        photo: booking.coworker?.profile_photo_url,
        role: "Coworker"
      };
    } else {
      return {
        id: booking.space?.host_id || '',
        name: booking.space?.title || "Spazio",
        photo: null,
        role: "Host"
      };
    }
  };

  const canCancelBooking = () => {
    // Check if we can cancel based on status
    const canCancelByStatus = booking.status === "confirmed" || booking.status === "pending";
    
    // Check if we're before the booking start time (with Italian timezone)
    const now = new Date();
    const timeZone = 'Europe/Rome';
    let canCancelByTime = true;
    
    if (booking.booking_date && booking.start_time) {
      try {
        // Create date string in ISO format
        const dateTimeString = `${booking.booking_date}T${booking.start_time}`;
        
        // Parse the booking date as if it's in Italian timezone
        const bookingStartUTC = parseISO(dateTimeString);
        const bookingStartLocal = toZonedTime(bookingStartUTC, timeZone);
        const nowLocal = toZonedTime(now, timeZone);
        
        // Validate that the parsed date is valid
        if (isNaN(bookingStartLocal.getTime())) {
          canCancelByTime = false;
        } else {
          // Can't cancel if current time is at or past the booking start time
          canCancelByTime = isBefore(nowLocal, bookingStartLocal);
          
          // Additional safety check - if booking is more than 1 day in the past, definitely can't cancel
          const oneDayAgo = addMinutes(nowLocal, -24 * 60);
          if (isBefore(bookingStartLocal, oneDayAgo)) {
            canCancelByTime = false;
          }
        }
      } catch (error) {
        // If there's an error parsing, don't allow cancellation for safety
        canCancelByTime = false;
      }
    } else {
      canCancelByTime = false;
    }
    
    return canCancelByStatus && canCancelByTime;
  };

  const getBookingStatusInfo = () => {
    if (booking.status === 'pending') {
      if (booking.space?.confirmation_type === 'instant') {
        return {
          icon: <Euro className="w-4 h-4" />,
          text: "In attesa di pagamento",
          color: "text-orange-600"
        };
      } else {
        return {
          icon: <Clock className="w-4 h-4" />,
          text: "In attesa di approvazione host",
          color: "text-yellow-600"
        };
      }
    }
    return null;
  };

  const getChatButtonState = () => {
    if (isChatEnabled) {
      return {
        enabled: true,
        text: "Messaggi",
        tooltip: null
      };
    }
    
    if (booking.status === 'pending') {
      if (booking.space?.confirmation_type === 'instant') {
        return {
          enabled: false,
          text: "Chat (dopo pagamento)",
          tooltip: "La chat sarà disponibile dopo il completamento del pagamento"
        };
      } else {
        return {
          enabled: false,
          text: "Chat (dopo approvazione)",
          tooltip: "La chat sarà disponibile dopo l'approvazione dell'host e il pagamento"
        };
      }
    }
    
    return {
      enabled: false,
      text: "Chat non disponibile",
      tooltip: "Chat non disponibile per questa prenotazione"
    };
  };

  const otherParty = getOtherParty();
  
  // Use UTC-aware date formatting
  const dateTimeFormatted = booking.booking_date && booking.start_time 
    ? (() => {
        const parsed = parseBookingDateTime(booking.booking_date, booking.start_time);
        return parsed.isValid && parsed.utcDate 
          ? formatBookingDateTime(parsed.utcDate)
          : { 
              date: format(new Date(booking.booking_date), "EEEE d MMMM yyyy", { locale: it }),
              time: `${booking.start_time} - ${booking.end_time || ''}`,
              fullDateTime: format(new Date(booking.booking_date), "EEEE d MMMM yyyy", { locale: it })
            };
      })()
    : { 
        date: 'Data non disponibile',
        time: 'Orario non disponibile',
        fullDateTime: 'Data e orario non disponibili'
      };
  
  const statusInfo = getBookingStatusInfo();
  const chatState = getChatButtonState();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {booking.space?.title || 'Spazio senza titolo'}
              {booking.space?.confirmation_type === 'instant' && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Shield className="w-3 h-3 mr-1" />
                  Immediata
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              {booking.space?.address || 'Indirizzo non disponibile'}
            </div>
            {statusInfo && (
              <div className={`flex items-center text-sm mt-1 ${statusInfo.color}`}>
                {statusInfo.icon}
                <span className="ml-1">{statusInfo.text}</span>
              </div>
            )}
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
              {dateTimeFormatted.date}
            </div>
            {booking.start_time && booking.end_time && (
              <p className="text-xs text-gray-500">
                {dateTimeFormatted.time}
              </p>
            )}
            {booking.slot_reserved_until && booking.status === 'pending' && (
              <p className="text-xs text-orange-600 mt-1">
                <Clock className="w-3 h-3 inline mr-1" />
                Slot riservato fino: {formatUtcDateForDisplay(booking.slot_reserved_until, 'HH:mm')}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <MessagesButton 
            booking={booking}
            variant={chatState.enabled ? "outline" : "secondary"}
            disabled={!chatState.enabled}
          />
          
          {/* Review button - only show for completed bookings */}
          {booking.status === 'confirmed' && otherParty.id && isChatEnabled && (
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
