import React, { useState, useMemo } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { BookingWithDetails } from '@/types/booking';
import { HostBookingCalendarDay } from './HostBookingCalendarDay';
import { HostBookingDayDetailsDrawer } from './HostBookingDayDetailsDrawer';
import { groupBookingsByDate, getCalendarDays } from './utils/calendarHelpers';
import { extractHostSpaces } from './utils/hostCalendarHelpers';

interface HostBookingsCalendarViewProps {
  bookings: BookingWithDetails[];
  getUserRole: (booking: BookingWithDetails) => "host" | "coworker";
  isChatEnabled: (booking: BookingWithDetails) => boolean;
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
  onEventClick?: (booking: BookingWithDetails) => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export const HostBookingsCalendarView = ({
  bookings,
  getUserRole,
  isChatEnabled,
  onOpenMessageDialog,
  onOpenCancelDialog,
  onEventClick
}: HostBookingsCalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('all');

  // Estrai gli spazi unici dai bookings
  const hostSpaces = useMemo(() => extractHostSpaces(bookings), [bookings]);

  // Filtra i bookings in base allo spazio selezionato
  const filteredBookings = useMemo(() => {
    if (selectedSpaceId === 'all') return bookings;
    return bookings.filter(b => b.space_id === selectedSpaceId);
  }, [bookings, selectedSpaceId]);

  const bookingsByDate = useMemo(() => groupBookingsByDate(filteredBookings), [filteredBookings]);

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
    setTimeout(() => setSelectedDate(null), 300);
  };

  const viewMode = selectedSpaceId === 'all' ? 'all' : 'single';

  return (
    <div className="space-y-4">
      {/* Header con filtro spazi e navigazione */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h2>

          {/* Filtro spazi */}
          <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
            <SelectTrigger className="w-[250px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Seleziona spazio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Tutti gli spazi ({hostSpaces.reduce((sum, s) => sum + s.bookingCount, 0)} prenotazioni)
              </SelectItem>
              {hostSpaces.map(space => (
                <SelectItem key={space.id} value={space.id}>
                  {space.title} ({space.bookingCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

      {/* Info vista corrente */}
      <div className="text-sm text-muted-foreground">
        {viewMode === 'all' ? (
          <p>Vista aggregata di tutti gli spazi. Il numero indica le prenotazioni totali per giorno.</p>
        ) : (
          <p>Vista dettagliata per lo spazio selezionato. Ogni card mostra una prenotazione.</p>
        )}
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
            <HostBookingCalendarDay
              key={index}
              date={day.date}
              isCurrentMonth={day.isCurrentMonth}
              bookings={day.bookings}
              isSelected={selectedDate ? format(day.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') : false}
              onClick={() => handleDayClick(day.date, day.bookings)}
              viewMode={viewMode}
              selectedSpaceId={selectedSpaceId}
            />
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="space-y-2">
        {viewMode === 'all' ? (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="font-medium">Livello occupazione:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-50"></div>
              <span>Basso (1-2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-50"></div>
              <span>Medio (3-4)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-50"></div>
              <span>Alto (5+)</span>
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {/* Drawer dettagli giorno */}
      <HostBookingDayDetailsDrawer
        open={drawerOpen}
        onOpenChange={handleDrawerClose}
        selectedDate={selectedDate}
        bookings={selectedDateBookings}
        getUserRole={getUserRole}
        isChatEnabled={isChatEnabled}
        onOpenMessageDialog={onOpenMessageDialog}
        onOpenCancelDialog={onOpenCancelDialog}
        viewMode={viewMode}
        {...(onEventClick ? { onBookingClick: onEventClick } : {})}
      />
    </div>
  );
};
