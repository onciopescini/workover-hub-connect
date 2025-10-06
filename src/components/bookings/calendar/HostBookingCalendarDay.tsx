import React from 'react';
import { format, isToday } from 'date-fns';
import { BookingWithDetails } from '@/types/booking';
import { aggregateDayData, getOccupancyColor, formatSingleSpaceBadge, getStatusColor } from './utils/hostCalendarHelpers';
import { cn } from '@/lib/utils';

interface HostBookingCalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  bookings: BookingWithDetails[];
  isSelected: boolean;
  onClick: () => void;
  viewMode: 'all' | 'single';
  selectedSpaceId?: string;
}

export const HostBookingCalendarDay = ({
  date,
  isCurrentMonth,
  bookings,
  isSelected,
  onClick,
  viewMode,
  selectedSpaceId
}: HostBookingCalendarDayProps) => {
  const dayNumber = format(date, 'd');
  const hasBookings = bookings.length > 0;
  const isTodayDate = isToday(date);

  // Vista "Tutti gli spazi" - mostra numero totale prenotazioni e livello occupazione
  if (viewMode === 'all') {
    const aggregated = aggregateDayData(bookings);
    const occupancyColors = getOccupancyColor(aggregated.occupancyLevel);

    return (
      <div
        onClick={hasBookings ? onClick : undefined}
        className={cn(
          "min-h-[100px] p-2 border border-border transition-colors",
          !isCurrentMonth && "bg-muted/30 text-muted-foreground",
          isCurrentMonth && hasBookings && occupancyColors.bg,
          isCurrentMonth && !hasBookings && "bg-background",
          hasBookings && "cursor-pointer hover:ring-2 hover:ring-primary/50",
          isSelected && "ring-2 ring-primary",
          isTodayDate && "font-bold"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className={cn(
              "text-sm",
              isTodayDate && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
            )}
          >
            {dayNumber}
          </span>
        </div>

        {hasBookings && (
          <div className="space-y-1">
            <div className={cn("text-center py-2", occupancyColors.text)}>
              <div className="text-2xl font-bold">{aggregated.totalBookings}</div>
              <div className="text-xs">
                {aggregated.totalBookings === 1 ? 'prenotazione' : 'prenotazioni'}
              </div>
            </div>
            <div className="text-xs text-center text-muted-foreground">
              {aggregated.spaceBookings.size} {aggregated.spaceBookings.size === 1 ? 'spazio' : 'spazi'}
            </div>
            {aggregated.totalParticipants > aggregated.totalBookings && (
              <div className="text-xs text-center text-muted-foreground">
                {aggregated.totalParticipants} partecipanti
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Vista "Spazio singolo" - mostra dettagli delle prenotazioni
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
          const badge = formatSingleSpaceBadge(booking);
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
              <div className="font-medium truncate">{badge.name}</div>
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
