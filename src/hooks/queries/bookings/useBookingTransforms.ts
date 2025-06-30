
import { BookingWithDetails } from "@/types/booking";

export const transformCoworkerBookings = (data: any[]): BookingWithDetails[] => {
  return data.map(booking => ({
    ...booking,
    space: booking.space || {},
    coworker: null, // For coworker bookings, user is the coworker
    payments: booking.payments || []
  }));
};

export const transformHostBookings = (data: any[]): BookingWithDetails[] => {
  return data.map(booking => ({
    ...booking,
    space: booking.space || {},
    coworker: booking.coworker || null,
    payments: booking.payments || []
  }));
};

export const applySearchFilter = (bookings: BookingWithDetails[], searchTerm: string): BookingWithDetails[] => {
  if (!searchTerm) return bookings;
  
  const searchLower = searchTerm.toLowerCase();
  return bookings.filter(booking =>
    booking.space?.title?.toLowerCase().includes(searchLower) ||
    booking.space?.address?.toLowerCase().includes(searchLower) ||
    (booking.coworker && 
      `${booking.coworker.first_name} ${booking.coworker.last_name}`.toLowerCase().includes(searchLower))
  );
};

export const removeDuplicateBookings = (bookings: BookingWithDetails[]): BookingWithDetails[] => {
  const seen = new Set();
  return bookings.filter(booking => {
    if (seen.has(booking.id)) {
      return false;
    }
    seen.add(booking.id);
    return true;
  });
};
