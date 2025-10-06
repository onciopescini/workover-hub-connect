import React from 'react';
import { format, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { BookingWithDetails } from '@/types/booking';
import { formatBookingBadge, getStatusColor } from './utils/calendarHelpers';
import { cn } from '@/lib/utils';

interface BookingCalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  bookings: BookingWithDetails[];
  isSelected: boolean;
  onClick: () => void;
}

export const BookingCalendarDay = ({
  date,
  isCurrentMonth,
  bookings,
  isSelected,
  onClick
}: BookingCalendarDayProps) => {
  const dayNumber = format(date, 'd');
  const hasBookings = bookings.length > 0;
  const isTodayDate = isToday(date);
  
  const maxVisibleBookings = 3;
  const visibleBookings = bookings.slice(0, maxVisibleBookings);
  const remainingCount = Math.max(0, bookings.length - maxVisibleBookings);

  return (
    <div
      onClick={hasBookings ? onClick : undefined}
      className={cn(
        "min-h-[120px] p-2 border border-border transition-colors",
        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
        isCurrentMonth && "bg-background",
        hasBookings && "cursor-pointer hover:bg-accent/50",
        isSelected && "ring-2 ring-primary",
        isTodayDate && "font-bold"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "text-sm",
            isTodayDate && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
          )}
        >
          {dayNumber}
        </span>
        {hasBookings && (
          <span className="text-xs text-muted-foreground">
            {bookings.length}
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        {visibleBookings.map((booking) => {
          const badge = formatBookingBadge(booking);
          const colors = getStatusColor(badge.status);
          
          return (
            <div
              key={booking.id}
              className={cn(
                "text-xs p-1 rounded border",
                colors.bg,
                colors.border,
                colors.text,
                "truncate",
                booking.status === 'cancelled' && "opacity-60"
              )}
            >
              <div className="font-medium truncate">{badge.title}</div>
              {badge.time && (
                <div className="text-xs opacity-75">{badge.time}</div>
              )}
            </div>
          );
        })}
        
        {remainingCount > 0 && (
          <div className="text-xs text-muted-foreground italic px-1">
            +{remainingCount} {remainingCount === 1 ? 'altra' : 'altre'}
          </div>
        )}
      </div>
    </div>
  );
};
