
import { format, parseISO, isBefore, addMinutes } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { it } from "date-fns/locale";
import { utcToLocal, isDateInPast, parseBookingDateTime, formatBookingDateTime, formatUtcDateForDisplay } from "@/lib/date-utils";
import { canCancelBooking } from "@/lib/booking-datetime-utils";
import { BookingWithDetails } from "@/types/booking";
import { Calendar, MapPin, User, MessageSquare, X, Clock, Shield, Euro, Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from "@/types/booking";
import { ReviewButton } from "./ReviewButton";
import { MessagesButton } from "@/components/messaging/MessagesButton";
import { CoworkerList } from "@/components/networking/CoworkerList";
import { StarRating } from "@/components/ui/StarRating";
import { BookingQRCode } from "./checkin/BookingQRCode";

interface EnhancedBookingCardProps {
  booking: BookingWithDetails;
  userRole: "host" | "coworker";
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
  // Approval workflow props - Required for Host Dashboard
  onApproveBooking?: (bookingId: string) => Promise<void>;
  onOpenRejectDialog?: (booking: BookingWithDetails) => void;
  isChatEnabled?: boolean;
}

export const EnhancedBookingCard = ({ 
  booking, 
  userRole, 
  onOpenMessageDialog, 
  onOpenCancelDialog,
  onApproveBooking,
  onOpenRejectDialog,
  isChatEnabled = false
}: EnhancedBookingCardProps) => {
  const getOtherParty = () => {
    if (userRole === "host") {
      // Cast to any to access cached_avg_rating which may not be in strict type
      const coworker = booking.coworker as any;
      return {
        id: booking.user_id,
        name: `${booking.coworker?.first_name || ''} ${booking.coworker?.last_name || ''}`.trim() || 'Coworker',
        photo: booking.coworker?.profile_photo_url,
        role: "Coworker",
        rating: coworker?.cached_avg_rating as number | undefined
      };
    } else {
      return {
        id: booking.space?.host_id || '',
        name: booking.space?.title || "Spazio",
        photo: null,
        role: "Host",
        rating: undefined
      };
    }
  };

  const canCancelBooking = () => {
    // Allows cancellation for confirmed bookings.
    // Pending bookings use Reject instead of Cancel for hosts, but Coworkers might still want to cancel.
    // However, per requirements: "Do NOT show the "Cancel" button for pending requests (Reject covers this)."
    // This implies for the HOST view.
    // If I am a Coworker, I should still be able to cancel my pending request?
    // The requirement says "Host Booking interface needs functionality updates".
    // So for userRole === 'host', we hide Cancel on pending.

    if (userRole === 'host' && booking.status === 'pending') {
      return false;
    }

    return booking.status === "confirmed" || booking.status === "pending";
  };

  const canActionPending = () => {
    return (booking.status === "pending_approval" || booking.status === "pending") && userRole === "host";
  };

  const getBookingStatusInfo = () => {
    if (booking.status === 'pending' || booking.status === 'pending_approval') {
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
    
    // Check if payment has been completed
    const hasCompletedPayment = booking.payments?.some(
      payment => payment.payment_status === 'completed' || payment.payment_status === 'paid'
    );
    
    if (booking.status === 'pending' || booking.status === 'pending_approval') {
      if (booking.space?.confirmation_type === 'instant') {
        // Enable chat for instant bookings if payment is completed
        if (hasCompletedPayment) {
          return {
            enabled: true,
            text: "Messaggi",
            tooltip: null
          };
        }
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
            <div className="relative group">
              <Avatar className="w-10 h-10">
                <AvatarImage src={otherParty.photo || undefined} />
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={`/users/${otherParty.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-primary/10 text-primary rounded-full p-1">
                        <User className="w-3 h-3" />
                      </div>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Visualizza profilo</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <a
                href={`/users/${otherParty.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-900 hover:text-primary transition-colors flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {otherParty.name}
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600">{otherParty.role}</p>
                {otherParty.rating !== undefined && (
                   <div className="flex items-center">
                     <StarRating rating={otherParty.rating} readOnly size="sm" />
                   </div>
                )}
              </div>
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
          {booking.status === 'served' && (
            userRole === 'host' ? (
              // Host reviews coworker
              otherParty.id && (
                <ReviewButton
                  booking={booking}
                  reviewType="coworker"
                  targetId={otherParty.id}
                  targetName={otherParty.name}
                />
              )
            ) : (
              // Coworker reviews space
              booking.space_id && (
                <ReviewButton
                  booking={booking}
                  reviewType="space"
                  targetId={booking.space_id}
                  targetName={booking.space?.title || "Spazio"}
                />
              )
            )
          )}
          
          {/* Pending Approval Actions - Host Only */}
          {canActionPending() && onApproveBooking && onOpenRejectDialog && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex items-center bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => onApproveBooking(booking.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accetta
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Approva la richiesta</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex items-center"
                      onClick={() => onOpenRejectDialog(booking)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Rifiuta
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Rifiuta la richiesta</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
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

        {/* QR Code for Guest Check-in - Only for Coworker view */}
        {userRole === 'coworker' && (
          <BookingQRCode 
            bookingId={booking.id}
            bookingDate={booking.booking_date}
            status={booking.status}
            startTime={booking.start_time}
            endTime={booking.end_time}
          />
        )}

        {booking.status === 'served' && userRole === 'coworker' && (
          <div className="mt-6 pt-4 border-t">
            <CoworkerList bookingId={booking.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
