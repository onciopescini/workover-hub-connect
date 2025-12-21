import { BookingWithDetails } from '@/types/booking';
import { format } from 'date-fns';
import { getStatusColor as getBaseStatusColor } from './calendarHelpers';

export interface HostSpaceOption {
  id: string;
  title: string;
  bookingCount: number;
}

export interface AggregatedDayData {
  totalBookings: number;
  totalParticipants: number;
  spaceBookings: Map<string, BookingWithDetails[]>;
  occupancyLevel: 'low' | 'medium' | 'high';
}

/**
 * Estrae la lista unica degli spazi dai bookings dell'host
 */
export const extractHostSpaces = (bookings: BookingWithDetails[]): HostSpaceOption[] => {
  const spacesMap = new Map<string, HostSpaceOption>();
  
  bookings.forEach(booking => {
    if (booking.space_id && booking.space?.title) {
      if (!spacesMap.has(booking.space_id)) {
        spacesMap.set(booking.space_id, {
          id: booking.space_id,
          title: booking.space.title,
          bookingCount: 0
        });
      }
      const space = spacesMap.get(booking.space_id)!;
      space.bookingCount++;
    }
  });
  
  return Array.from(spacesMap.values()).sort((a, b) => 
    b.bookingCount - a.bookingCount // Ordina per numero di prenotazioni
  );
};

/**
 * Aggrega i dati delle prenotazioni per un giorno specifico (vista "Tutti gli spazi")
 */
export const aggregateDayData = (bookings: BookingWithDetails[]): AggregatedDayData => {
  const spaceBookings = new Map<string, BookingWithDetails[]>();
  let totalParticipants = 0;
  
  bookings.forEach(booking => {
    const spaceId = booking.space_id;
    if (!spaceBookings.has(spaceId)) {
      spaceBookings.set(spaceId, []);
    }
    spaceBookings.get(spaceId)!.push(booking);
    
    // Conta i partecipanti (per ora 1 per booking)
    totalParticipants += 1;
  });
  
  // Determina livello di occupazione basato sul numero di prenotazioni
  let occupancyLevel: 'low' | 'medium' | 'high' = 'low';
  if (bookings.length >= 5) {
    occupancyLevel = 'high';
  } else if (bookings.length >= 3) {
    occupancyLevel = 'medium';
  }
  
  return {
    totalBookings: bookings.length,
    totalParticipants,
    spaceBookings,
    occupancyLevel
  };
};

/**
 * Raggruppa i bookings per spazio per la vista del drawer
 */
export const groupBookingsBySpace = (bookings: BookingWithDetails[]): Map<string, {
  space: { id: string; title: string };
  bookings: BookingWithDetails[];
}> => {
  const grouped = new Map<string, {
    space: { id: string; title: string };
    bookings: BookingWithDetails[];
  }>();
  
  bookings.forEach(booking => {
    const spaceId = booking.space_id;
    const spaceTitle = booking.space?.title || 'Spazio senza nome';
    
    if (!grouped.has(spaceId)) {
      grouped.set(spaceId, {
        space: { id: spaceId, title: spaceTitle },
        bookings: []
      });
    }
    grouped.get(spaceId)!.bookings.push(booking);
  });
  
  // Ordina i bookings per orario all'interno di ogni spazio
  grouped.forEach(group => {
    group.bookings.sort((a, b) => {
      const timeA = a.start_time || '';
      const timeB = b.start_time || '';
      return timeA.localeCompare(timeB);
    });
  });
  
  return grouped;
};

/**
 * Ottiene il colore del livello di occupazione
 */
export const getOccupancyColor = (level: 'low' | 'medium' | 'high'): { bg: string; text: string } => {
  switch (level) {
    case 'high':
      return { bg: 'bg-red-50', text: 'text-red-700' };
    case 'medium':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700' };
    case 'low':
      return { bg: 'bg-green-50', text: 'text-green-700' };
  }
};

/**
 * Re-export getStatusColor from base helpers
 */
export const getStatusColor = getBaseStatusColor;

/**
 * Formatta le informazioni per il badge nella vista singolo spazio
 */
export const formatSingleSpaceBadge = (booking: BookingWithDetails) => {
  const coworkerName = booking.coworker 
    ? `${booking.coworker.first_name || ''} ${booking.coworker.last_name || ''}`.trim()
    : 'Coworker';
  
  const firstName = coworkerName.split(' ')[0];
  
  const startTime = booking.start_time ? booking.start_time.substring(0, 5) : '';
  const endTime = booking.end_time ? booking.end_time.substring(0, 5) : '';
  const timeRange = startTime && endTime ? `${startTime}-${endTime}` : '';
  
  return {
    name: firstName,
    time: timeRange,
    status: booking.status
  };
};
