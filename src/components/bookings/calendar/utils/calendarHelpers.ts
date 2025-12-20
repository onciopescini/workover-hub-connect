import { BookingWithDetails } from '@/types/booking';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';

export interface BookingsByDate {
  [key: string]: BookingWithDetails[];
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  bookings: BookingWithDetails[];
}

/**
 * Raggruppa le prenotazioni per data
 */
export const groupBookingsByDate = (bookings: BookingWithDetails[]): BookingsByDate => {
  const grouped: BookingsByDate = {};
  
  bookings.forEach(booking => {
    const dateKey = format(new Date(booking.booking_date), 'yyyy-MM-dd');
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(booking);
  });
  
  return grouped;
};

/**
 * Genera i giorni del calendario per un mese specifico
 */
export const getCalendarDays = (year: number, month: number, bookingsByDate: BookingsByDate): CalendarDay[] => {
  const date = new Date(year, month);
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { locale: it, weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { locale: it, weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  return days.map(day => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return {
      date: day,
      isCurrentMonth: isSameMonth(day, date),
      bookings: bookingsByDate[dateKey] || []
    };
  });
};

/**
 * Formatta il badge di una prenotazione per la visualizzazione compatta
 */
export const formatBookingBadge = (booking: BookingWithDetails) => {
  const spaceTitle = booking.workspaces?.name || 'Spazio';
  const abbreviatedTitle = spaceTitle.length > 12 ? `${spaceTitle.substring(0, 12)}...` : spaceTitle;
  
  const startTime = booking.start_time ? booking.start_time.substring(0, 5) : '';
  const endTime = booking.end_time ? booking.end_time.substring(0, 5) : '';
  const timeRange = startTime && endTime ? `${startTime}-${endTime}` : '';
  
  return {
    title: abbreviatedTitle,
    time: timeRange,
    status: booking.status
  };
};

/**
 * Ottiene il colore del badge basato sullo status
 */
export const getStatusColor = (status: string): { bg: string; border: string; text: string } => {
  switch (status) {
    case 'confirmed':
      return {
        bg: 'bg-green-100',
        border: 'border-green-500',
        text: 'text-green-700'
      };
    case 'pending':
      return {
        bg: 'bg-yellow-100',
        border: 'border-yellow-500',
        text: 'text-yellow-700'
      };
    case 'cancelled':
      return {
        bg: 'bg-red-100',
        border: 'border-red-500',
        text: 'text-red-700'
      };
    default:
      return {
        bg: 'bg-gray-100',
        border: 'border-gray-500',
        text: 'text-gray-700'
      };
  }
};
