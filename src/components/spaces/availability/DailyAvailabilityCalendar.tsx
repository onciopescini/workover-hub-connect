import React from 'react';
import { SlotProgressBar } from './SlotProgressBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface TimeSlot {
  time: string;
  available: number;
  total: number;
}

interface DailyAvailabilityCalendarProps {
  spaceId: string;
  date: Date;
  slots: TimeSlot[];
  isLoading?: boolean;
  onSlotClick?: (time: string) => void;
  selectedSlot?: string;
  openingTime?: string;
  closingTime?: string;
}

export const DailyAvailabilityCalendar: React.FC<DailyAvailabilityCalendarProps> = ({
  date,
  slots,
  isLoading = false,
  onSlotClick,
  selectedSlot,
  openingTime = '09:00',
  closingTime = '18:00',
}) => {
  // Filter slots based on space opening hours
  const filteredSlots = slots.filter((slot) => {
    return slot.time >= openingTime && slot.time < closingTime;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-5 w-5" />
          Disponibilità per {format(date, 'dd MMMM yyyy', { locale: it })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredSlots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nessuno slot disponibile per questa data</p>
            <p className="text-xs mt-1">Orari di apertura: {openingTime} - {closingTime}</p>
          </div>
        ) : (
          filteredSlots.map((slot) => (
            <SlotProgressBar
              key={slot.time}
              time={slot.time}
              available={slot.available}
              total={slot.total}
              onClick={() => onSlotClick?.(slot.time)}
              isSelected={selectedSlot === slot.time}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};