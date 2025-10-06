import React, { useState, useMemo } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BookingWithDetails } from '@/types/booking';
import { BookingCalendarDay } from './BookingCalendarDay';
import { BookingDayDetailsDrawer } from './BookingDayDetailsDrawer';
import { groupBookingsByDate, getCalendarDays } from './utils/calendarHelpers';

interface BookingsCalendarViewProps {
  bookings: BookingWithDetails[];
  getUserRole: (booking: BookingWithDetails) => "host" | "coworker";
  isChatEnabled: (booking: BookingWithDetails) => boolean;
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export const BookingsCalendarView = ({
  bookings,
  getUserRole,
  isChatEnabled,
  onOpenMessageDialog,
  onOpenCancelDialog
}: BookingsCalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const bookingsByDate = useMemo(() => groupBookingsByDate(bookings), [bookings]);
  
  const calendarDays = useMemo(
    () => getCalendarDays(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      bookingsByDate
    ),
    [currentMonth, bookingsByDate]
  );

  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return bookingsByDate[dateKey] || [];
  }, [selectedDate, bookingsByDate]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const handleDayClick = (date: Date, bookings: BookingWithDetails[]) => {
    if (bookings.length > 0) {
      setSelectedDate(date);
      setDrawerOpen(true);
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    // Non resettiamo selectedDate immediatamente per evitare flash
    setTimeout(() => setSelectedDate(null), 300);
  };

  return (
    <div className="space-y-4">
      {/* Header con navigazione */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: it })}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Oggi
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Griglia calendario */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Header giorni settimana */}
        <div className="grid grid-cols-7 border-b bg-muted">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Giorni del mese */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <BookingCalendarDay
              key={index}
              date={day.date}
              isCurrentMonth={day.isCurrentMonth}
              bookings={day.bookings}
              isSelected={selectedDate ? format(day.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') : false}
              onClick={() => handleDayClick(day.date, day.bookings)}
            />
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-500"></div>
          <span>Confermata</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-500"></div>
          <span>In attesa</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-500"></div>
          <span>Cancellata</span>
        </div>
      </div>

      {/* Drawer dettagli giorno */}
      <BookingDayDetailsDrawer
        open={drawerOpen}
        onOpenChange={handleDrawerClose}
        selectedDate={selectedDate}
        bookings={selectedDateBookings}
        getUserRole={getUserRole}
        isChatEnabled={isChatEnabled}
        onOpenMessageDialog={onOpenMessageDialog}
        onOpenCancelDialog={onOpenCancelDialog}
      />
    </div>
  );
};
