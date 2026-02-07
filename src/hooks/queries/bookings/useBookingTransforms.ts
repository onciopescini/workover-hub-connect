
import { BookingWithDetails } from "@/types/booking";
import { logger } from "@/lib/logger";

interface RawSpace {
  id: string;
  title: string;
  address: string;
  photos: unknown[] | string[] | null;
  host_id: string;
  price_per_day: number;
  confirmation_type: string;
}

interface RawBookingData {
  id?: string;
  space_id?: string | null;
  user_id?: string;
  booking_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  cancelled_at?: string | null;
  cancellation_fee?: number | null;
  cancelled_by_host?: boolean | null;
  cancellation_reason?: string | null;
  slot_reserved_until?: string | null;
  payment_required?: boolean | null;
  payment_session_id?: string | null;
  reservation_token?: string | null;
  service_completed_at?: string | null;

  // The fetcher returns 'spaces' (joined table)
  spaces?: RawSpace | RawSpace[] | null | undefined;

  // Legacy or alternative field structure
  space?: {
    id?: string;
    title?: string;
    address?: string;
    photos?: string[];
    host_id?: string;
    price_per_day?: number;
    confirmation_type?: string;
  } | undefined;

  coworker?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    profile_photo_url?: string | null;
  }[] | {
    id?: string;
    first_name?: string;
    last_name?: string;
    profile_photo_url?: string | null;
  } | null | undefined;

  // Accept undefined from Supabase queries (exactOptionalPropertyTypes: true)
  payments?: unknown[] | null | undefined;
  
  // Allow for extra properties from the database
  [key: string]: unknown;
}

const toStringArray = (arr: unknown[] | string[] | null | undefined): string[] => {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.map(item => typeof item === 'string' ? item : String(item));
};

const getSpaceData = (booking: RawBookingData) => {
  // Priority 1: Check 'spaces' returned by Supabase join
  if (booking.spaces) {
    const s = Array.isArray(booking.spaces) ? booking.spaces[0] : booking.spaces;
    if (s) {
      const photos = toStringArray(s.photos);
      return {
        id: s.id,
        title: s.title,
        address: s.address,
        image_url: photos.length > 0 ? photos[0] : '', // Map first photo to image_url
        photos: photos, // Keep photos array for gallery if needed
        type: 'space', // Default type as it's not currently fetched
        host_id: s.host_id, // CRITICAL: Ensure host_id is mapped
        price_per_day: s.price_per_day,
        confirmation_type: s.confirmation_type
      };
    }
  }

  // Priority 2: Check legacy 'space' property
  if (booking.space) {
    return {
      id: booking.space.id || '',
      title: booking.space.title || 'Spazio senza titolo',
      address: booking.space.address || 'Indirizzo non disponibile',
      image_url: (booking.space.photos && booking.space.photos.length > 0) ? booking.space.photos[0] : '',
      photos: booking.space.photos || [],
      type: 'space',
      host_id: booking.space.host_id || '',
      price_per_day: booking.space.price_per_day || 0,
      confirmation_type: booking.space.confirmation_type || 'host_approval'
    };
  }

  // Fallback: Empty/Default data
  return {
    id: '',
    title: 'Dati spazio mancanti',
    address: '',
    image_url: '',
    photos: [],
    type: 'space',
    host_id: '',
    price_per_day: 0,
    confirmation_type: 'host_approval'
  };
};

export const transformCoworkerBookings = (data: RawBookingData[]): BookingWithDetails[] => {
  if (!Array.isArray(data)) {
    logger.error('Invalid data provided to transformCoworkerBookings', {
      component: 'booking-transforms',
      action: 'transform_coworker_bookings_validation',
      metadata: { dataType: typeof data }
    }, new Error('Data is not an array'));
    return [];
  }

  return data.map(booking => {
    try {
      // @ts-ignore - The mapped object might have extra properties like 'photos' which are useful but strictly outside the current type definition if strict
      return {
        id: booking.id || '',
        space_id: booking.space_id || '',
        user_id: booking.user_id || '',
        booking_date: booking.booking_date || '',
        start_time: booking.start_time || '',
        end_time: booking.end_time || '',
        status: booking.status || 'pending',
        created_at: booking.created_at || '',
        updated_at: booking.updated_at || '',
        cancelled_at: booking.cancelled_at || null,
        cancellation_fee: booking.cancellation_fee || null,
        cancelled_by_host: booking.cancelled_by_host || null,
        cancellation_reason: booking.cancellation_reason || null,
        slot_reserved_until: booking.slot_reserved_until || null,
        payment_required: booking.payment_required || null,
        payment_session_id: booking.payment_session_id || null,
        reservation_token: booking.reservation_token || null,
        service_completed_at: booking.service_completed_at || null,
        space: getSpaceData(booking),
        coworker: null, // For coworker bookings, user is the coworker
        payments: Array.isArray(booking.payments) ? booking.payments : []
      };
    } catch (transformError) {
      const bookingId = booking.id || 'unknown';
      logger.error('Error transforming coworker booking', {
        component: 'booking-transforms',
        action: 'transform_coworker_booking_error',
        identifier: bookingId
      }, transformError as Error);
      return null;
    }
  }).filter(Boolean) as BookingWithDetails[];
};

export const transformHostBookings = (data: RawBookingData[]): BookingWithDetails[] => {
  if (!Array.isArray(data)) {
    logger.error('Invalid data provided to transformHostBookings', {
      component: 'booking-transforms',
      action: 'transform_host_bookings_validation',
      metadata: { dataType: typeof data }
    }, new Error('Data is not an array'));
    return [];
  }

  return data.map(booking => {
    try {
      // @ts-ignore
      return {
        id: booking.id || '',
        space_id: booking.space_id || '',
        user_id: booking.user_id || '',
        booking_date: booking.booking_date || '',
        start_time: booking.start_time || '',
        end_time: booking.end_time || '',
        status: booking.status || 'pending',
        created_at: booking.created_at || '',
        updated_at: booking.updated_at || '',
        cancelled_at: booking.cancelled_at || null,
        cancellation_fee: booking.cancellation_fee || null,
        cancelled_by_host: booking.cancelled_by_host || null,
        cancellation_reason: booking.cancellation_reason || null,
        slot_reserved_until: booking.slot_reserved_until || null,
        payment_required: booking.payment_required || null,
        payment_session_id: booking.payment_session_id || null,
        reservation_token: booking.reservation_token || null,
        service_completed_at: booking.service_completed_at || null,
        space: getSpaceData(booking),
        coworker: booking.coworker ? (Array.isArray(booking.coworker) ? booking.coworker[0] : booking.coworker) : null,
        payments: Array.isArray(booking.payments) ? booking.payments : []
      };
    } catch (transformError) {
      const bookingId = booking.id || 'unknown';
      logger.error('Error transforming host booking', {
        component: 'booking-transforms',
        action: 'transform_host_booking_error',
        identifier: bookingId
      }, transformError as Error);
      return null;
    }
  }).filter(Boolean) as BookingWithDetails[];
};

export const applySearchFilter = (bookings: BookingWithDetails[], searchTerm: string): BookingWithDetails[] => {
  if (!searchTerm || !searchTerm.trim()) return bookings;
  
  const searchLower = searchTerm.toLowerCase().trim();
  
  return bookings.filter(booking => {
    try {
      const spaceTitle = booking.space?.title?.toLowerCase() || '';
      const spaceAddress = booking.space?.address?.toLowerCase() || '';
      const coworkerName = booking.coworker 
        ? `${booking.coworker.first_name} ${booking.coworker.last_name}`.toLowerCase()
        : '';
      
      return spaceTitle.includes(searchLower) ||
             spaceAddress.includes(searchLower) ||
             coworkerName.includes(searchLower);
    } catch (filterError) {
      const bookingId = booking?.id || 'unknown';
      logger.error('Error applying search filter', {
        component: 'booking-transforms',
        action: 'apply_search_filter_error',
        identifier: bookingId,
        metadata: { searchTerm }
      }, filterError as Error);
      return false;
    }
  });
};
