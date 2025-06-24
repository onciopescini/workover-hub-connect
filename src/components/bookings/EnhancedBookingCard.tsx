
import React from 'react';
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { BookingWithDetails } from "@/types/booking";
import { Calendar, MapPin, User, MessageSquare, X, Star, Clock, Euro } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from "@/types/booking";
import { ReviewButton } from "./ReviewButton";

interface EnhancedBookingCardProps {
  booking: BookingWithDetails;
  userRole: "host" | "coworker";
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
}

export function EnhancedBookingCard({ 
  booking, 
  userRole, 
  onOpenMessageDialog, 
  onOpenCancelDialog 
}: EnhancedBookingCardProps) {
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
    return booking.status === "confirmed" || booking.status === "pending";
  };

  const otherParty = getOtherParty();
  const formattedDate = format(new Date(booking.booking_date), "EEEE d MMMM yyyy", { locale: it });
  const spaceImage = booking.space?.photos?.[0] || "/placeholder.svg";

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 border-indigo-500">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-4 flex-1">
            {/* Space Image */}
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img
                src={spaceImage}
                alt={booking.space?.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg";
                }}
              />
            </div>
            
            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {booking.space?.title || 'Spazio senza titolo'}
              </h3>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate">{booking.space?.address || 'Indirizzo non disponibile'}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                <span>{formattedDate}</span>
              </div>
              {booking.start_time && booking.end_time && (
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span>{booking.start_time} - {booking.end_time}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Status Badge */}
          <Badge className={BOOKING_STATUS_COLORS[booking.status as keyof typeof BOOKING_STATUS_COLORS]}>
            {BOOKING_STATUS_LABELS[booking.status as keyof typeof BOOKING_STATUS_LABELS]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Host/Price Info */}
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={otherParty.photo || undefined} />
              <AvatarFallback className="text-xs">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900 text-sm">{otherParty.name}</p>
              <p className="text-xs text-gray-600">{otherParty.role}</p>
            </div>
          </div>

          {booking.space?.price_per_day && (
            <div className="text-right">
              <div className="flex items-center text-sm font-semibold text-gray-900">
                <Euro className="w-4 h-4 mr-1" />
                {booking.space.price_per_day}
              </div>
              <p className="text-xs text-gray-500">per giorno</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
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

        {/* Progress indicator for pending bookings */}
        {booking.status === 'pending' && (
          <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-800">
              In attesa di conferma dall'host
            </p>
            <div className="w-full bg-yellow-200 rounded-full h-1 mt-1">
              <div className="bg-yellow-500 h-1 rounded-full w-1/2 animate-pulse"></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
