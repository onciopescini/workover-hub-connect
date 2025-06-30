
// Re-export all the refactored hooks from their new locations
export { useBookingFilters } from './bookings/useBookingFilters';
export { useEnhancedBookings as useEnhancedBookingsQuery } from './bookings/useEnhancedBookings';
export { useCoworkerBookings } from './bookings/useCoworkerBookings';
export { useHostBookings } from './bookings/useHostBookings';
export { useCancelBookingMutation as useEnhancedCancelBookingMutation } from './bookings/useCancelBookingMutation';

// Re-export types for backward compatibility
export type { BookingFilter } from './bookings/useBookingFilters';
