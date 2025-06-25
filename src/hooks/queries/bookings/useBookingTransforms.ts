
import { BookingWithDetails } from "@/types/booking";

// Transform coworker bookings (where user is the guest)
export const transformCoworkerBookings = (bookings: any[]): BookingWithDetails[] => {
  return bookings.map(booking => ({
    id: booking.id,
    space_id: booking.space_id,
    user_id: booking.user_id,
    booking_date: booking.booking_date,
    start_time: booking.start_time,
    end_time: booking.end_time,
    status: booking.status as 'pending' | 'confirmed' | 'cancelled',
    created_at: booking.created_at,
    updated_at: booking.updated_at,
    cancelled_at: booking.cancelled_at,
    cancellation_fee: booking.cancellation_fee,
    cancelled_by_host: booking.cancelled_by_host,
    cancellation_reason: booking.cancellation_reason,
    slot_reserved_until: booking.slot_reserved_until,
    payment_required: booking.payment_required,
    payment_session_id: booking.payment_session_id,
    reservation_token: booking.reservation_token,
    space: {
      id: booking.spaces.id,
      title: booking.spaces.title,
      address: booking.spaces.address,
      photos: booking.spaces.photos || [],
      host_id: booking.spaces.host_id,
      price_per_day: booking.spaces.price_per_day,
      confirmation_type: booking.spaces.confirmation_type
    },
    coworker: null, // User is the coworker
    payments: booking.payments || []
  }));
};

// Transform host bookings (where user owns the space)
export const transformHostBookings = (bookings: any[]): BookingWithDetails[] => {
  return bookings.map(booking => ({
    id: booking.id,
    space_id: booking.space_id,
    user_id: booking.user_id,
    booking_date: booking.booking_date,
    start_time: booking.start_time,
    end_time: booking.end_time,
    status: booking.status as 'pending' | 'confirmed' | 'cancelled',
    created_at: booking.created_at,
    updated_at: booking.updated_at,
    cancelled_at: booking.cancelled_at,
    cancellation_fee: booking.cancellation_fee,
    cancelled_by_host: booking.cancelled_by_host,
    cancellation_reason: booking.cancellation_reason,
    slot_reserved_until: booking.slot_reserved_until,
    payment_required: booking.payment_required,
    payment_session_id: booking.payment_session_id,
    reservation_token: booking.reservation_token,
    space: {
      id: booking.spaces.id,
      title: booking.spaces.title,
      address: booking.spaces.address,
      photos: booking.spaces.photos || [],
      host_id: booking.spaces.host_id,
      price_per_day: booking.spaces.price_per_day,
      confirmation_type: booking.spaces.confirmation_type
    },
    coworker: booking.profiles ? {
      id: booking.profiles.id,
      first_name: booking.profiles.first_name,
      last_name: booking.profiles.last_name,
      profile_photo_url: booking.profiles.profile_photo_url
    } : null,
    payments: booking.payments || []
  }));
};

// Apply search filter to bookings
export const applySearchFilter = (bookings: BookingWithDetails[], searchTerm: string): BookingWithDetails[] => {
  if (!searchTerm) return bookings;
  
  const searchLower = searchTerm.toLowerCase();
  return bookings.filter(booking =>
    booking.space.title.toLowerCase().includes(searchLower) ||
    booking.space.address.toLowerCase().includes(searchLower) ||
    (booking.coworker && 
      `${booking.coworker.first_name} ${booking.coworker.last_name}`.toLowerCase().includes(searchLower))
  );
};

// Remove duplicate bookings by ID
export const removeDuplicateBookings = (bookings: BookingWithDetails[]): BookingWithDetails[] => {
  return bookings.filter((booking, index, self) => 
    index === self.findIndex(b => b.id === booking.id)
  );
};
