import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, MessageSquare, XCircle, CheckCircle, User } from 'lucide-react';
import { BookingWithDetails } from '@/types/booking';
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '@/types/booking';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ReviewButton } from '../ReviewButton';

interface CompactBookingCardProps {
  booking: BookingWithDetails;
  userRole: 'host' | 'coworker';
  onOpenMessage: () => void;
  onOpenCancel: () => void;
  isChatEnabled: boolean;
}

export const CompactBookingCard: React.FC<CompactBookingCardProps> = ({
  booking,
  userRole,
  onOpenMessage,
  onOpenCancel,
  isChatEnabled
}) => {
  const isPast = booking.booking_date && new Date(booking.booking_date) < new Date();
  const canCancel = booking.status === 'confirmed' || booking.status === 'pending';

  const otherUser = userRole === 'host' 
    ? { 
        name: `${booking.coworker?.first_name || ''} ${booking.coworker?.last_name || ''}`.trim(),
        photo: booking.coworker?.profile_photo_url 
      }
    : { 
        name: booking.workspaces?.name || 'Host',
        photo: null 
      };

  return (
    <Card className="p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        {/* Avatar/Icon */}
        <Avatar className="h-12 w-12 flex-shrink-0">
          <AvatarImage src={otherUser.photo || undefined} />
          <AvatarFallback>
            {userRole === 'host' ? <User className="h-6 w-6" /> : <MapPin className="h-6 w-6" />}
          </AvatarFallback>
        </Avatar>

        {/* Main Info - Flexible */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate">
              {userRole === 'host' ? otherUser.name : booking.workspaces?.name}
            </h3>
            <Badge 
              variant={BOOKING_STATUS_COLORS[booking.status] as any}
              className="flex-shrink-0 text-xs"
            >
              {BOOKING_STATUS_LABELS[booking.status]}
            </Badge>
          </div>

          {/* Details Row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {booking.booking_date && format(new Date(booking.booking_date), 'dd MMM', { locale: it })}
            </div>
            {booking.start_time && booking.end_time && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {booking.start_time} - {booking.end_time}
              </div>
            )}
            {userRole === 'coworker' && booking.workspaces?.address && (
              <div className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{booking.workspaces.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions - Compact */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isChatEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenMessage}
              className="h-8 w-8 p-0"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}
          
          {booking.status === 'served' && (
            userRole === 'host' ? (
              booking.user_id && (
                <ReviewButton
                  booking={booking}
                  reviewType="coworker"
                  targetId={booking.user_id}
                  targetName={otherUser.name}
                />
              )
            ) : (
              booking.space_id && (
                <ReviewButton
                  booking={booking}
                  reviewType="space"
                  targetId={booking.space_id}
                  targetName={booking.workspaces?.name || "Spazio"}
                />
              )
            )
          )}
          
          {canCancel && !isPast && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenCancel}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
