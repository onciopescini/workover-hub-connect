import React from 'react';
import { BookingContext, SpaceContext } from '@/types/chat';
import { Calendar, Clock, MapPin, Euro } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface BookingContextCardProps {
  booking: BookingContext;
  space?: SpaceContext | null | undefined;
}

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'confirmed':
      return 'default';
    case 'pending':
    case 'pending_approval':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'confirmed':
      return 'Confermata';
    case 'pending':
    case 'pending_approval':
      return 'In attesa';
    case 'cancelled':
      return 'Cancellata';
    case 'completed':
      return 'Completata';
    default:
      return status;
  }
};

export const BookingContextCard: React.FC<BookingContextCardProps> = ({ booking, space }) => {
  const formattedDate = booking.booking_date 
    ? format(new Date(booking.booking_date), 'EEE d MMMM yyyy', { locale: it })
    : null;

  const formatTime = (time: string | null | undefined): string | null => {
    if (!time) return null;
    // time is in HH:MM:SS format
    return time.substring(0, 5);
  };

  return (
    <div className="bg-muted/50 rounded-lg p-3 mb-2 border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Dettagli prenotazione
        </span>
        <Badge variant={getStatusBadgeVariant(booking.status)}>
          {getStatusLabel(booking.status)}
        </Badge>
      </div>
      
      {space && (
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{space.title}</span>
        </div>
      )}
      
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {formattedDate && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formattedDate}</span>
          </div>
        )}
        
        {(booking.start_time || booking.end_time) && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {formatTime(booking.start_time)}
              {booking.end_time && ` - ${formatTime(booking.end_time)}`}
            </span>
          </div>
        )}
        
        {space?.price_per_hour && (
          <div className="flex items-center gap-1">
            <Euro className="h-3.5 w-3.5" />
            <span>{space.price_per_hour}€/ora</span>
          </div>
        )}
      </div>
    </div>
  );
};
