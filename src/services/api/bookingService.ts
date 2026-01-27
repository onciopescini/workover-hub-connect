/**
 * Booking Service Layer
 * 
 * Handles all booking-related API calls with proper error handling,
 * idempotency, and type safety.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

// Supabase project ID - URL is derived from this
const SUPABASE_PROJECT_ID = 'khtqwzvrxzsgfhsslwyz';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

// ============= TYPES =============

export interface ReserveSlotParams {
  spaceId: string;
  userId: string;
  startTime: string;  // ISO string
  endTime: string;    // ISO string
  guests: number;
  confirmationType: 'instant' | 'host_approval';
  clientBasePrice?: number;
}

export interface ReserveSlotResult {
  success: boolean;
  bookingId?: string;
  error?: string;
  errorCode?: 'CONFLICT' | 'VALIDATION' | 'SERVER_ERROR';
  data?: Readonly<{ bookingId: string; status: string }>;
}

export interface CreateCheckoutSessionResult {
  success: boolean;
  url?: string;
  sessionId?: string;
  error?: string;
  errorCode?: 'UNAUTHORIZED' | 'INVALID_REQUEST' | 'NETWORK' | 'SERVER_ERROR';
}

export interface SpaceBooking {
  id: string;
  booking_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  guests_count: number;
  user_id?: string;
}

export interface GetSpaceBookingsResult {
  success: boolean;
  bookings?: Readonly<SpaceBooking[]>;
  error?: string;
}

// ============= RESERVE SLOT =============

/**
 * Reserves a slot by calling the validate_and_reserve_slot RPC.
 * 
 * @param params - Reservation parameters
 * @returns Result with booking ID on success, or error details on failure
 */
export async function reserveSlot(params: ReserveSlotParams): Promise<ReserveSlotResult> {
  const {
    spaceId,
    userId,
    startTime,
    endTime,
    guests,
    confirmationType,
    clientBasePrice = 0
  } = params;

  // Check if user is suspended before RPC call
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', userId)
      .single();

    if (profile?.is_suspended) {
      sreLogger.warn('Suspended user attempted booking', { component: 'bookingService', userId });
      return {
        success: false,
        error: 'Account sospeso. Impossibile effettuare prenotazioni.',
        errorCode: 'VALIDATION'
      };
    }
  } catch (checkErr) {
    sreLogger.warn('Exception checking suspension status', { component: 'bookingService' }, checkErr as Error);
    // Continue - don't block if check fails
  }

  // Check self-booking prevention
  try {
    const { data: isSelfBooking } = await supabase.rpc('check_self_booking', {
      p_space_id: spaceId,
      p_user_id: userId
    });

    if (isSelfBooking) {
      sreLogger.warn('Self-booking attempt blocked', { component: 'bookingService', userId, spaceId });
      return {
        success: false,
        error: 'Non puoi prenotare il tuo stesso spazio.',
        errorCode: 'VALIDATION'
      };
    }
  } catch (checkErr) {
    sreLogger.warn('Exception checking self-booking', { component: 'bookingService' }, checkErr as Error);
    // Continue - RPC will also check this
  }

  const rpcParams = {
    p_space_id: spaceId,
    p_user_id: userId,
    p_start_time: startTime,
    p_end_time: endTime,
    p_guests_count: guests,
    p_confirmation_type: confirmationType,
    p_client_base_price: clientBasePrice
  };

  sreLogger.info('Calling validate_and_reserve_slot', { component: 'bookingService', ...rpcParams });

  const { data: rpcData, error: rpcError } = await supabase.rpc('validate_and_reserve_slot', rpcParams);

  // Handle RPC errors
  if (rpcError) {
    sreLogger.error('RPC error during slot reservation', { component: 'bookingService' }, rpcError as Error);
    
    // Map specific error codes
    if (rpcError.code === '23P01' || rpcError.message?.includes('overlap')) {
      return {
        success: false,
        error: 'Slot already booked',
        errorCode: 'CONFLICT'
      };
    }
    
    return {
      success: false,
      error: `Booking creation failed: ${rpcError.message}`,
      errorCode: 'SERVER_ERROR'
    };
  }

  // Handle empty response
  if (!rpcData) {
    sreLogger.error('RPC returned no data', { component: 'bookingService' });
    return {
      success: false,
      error: 'Reservation failed: No response from server',
      errorCode: 'SERVER_ERROR'
    };
  }

  // Extract booking ID from response
  // The RPC returns { booking_id: "...", status: "..." }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataObj = rpcData as any;
  const bookingId = dataObj.booking_id || dataObj;

  sreLogger.info('Reserved slot successfully', { component: 'bookingService', bookingId });

  if (typeof bookingId !== 'string') {
    sreLogger.error('Invalid Booking ID format', { component: 'bookingService', rpcData });
    return {
      success: false,
      error: 'Invalid Booking ID received from server',
      errorCode: 'SERVER_ERROR'
    };
  }

  return {
    success: true,
    bookingId
  };
}

// ============= CREATE CHECKOUT SESSION =============

/**
 * Creates a Stripe checkout session by calling the create-checkout-v3 Edge Function.
 * Uses native fetch for full header control (Idempotency-Key).
 * 
 * @param bookingId - The booking ID to create checkout for
 * @returns Result with checkout URL on success, or error details on failure
 */
export async function createCheckoutSession(bookingId: string): Promise<CreateCheckoutSessionResult> {
  // Get current user session for authorization
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !sessionData.session?.access_token) {
    sreLogger.error('Session error', { component: 'bookingService' }, sessionError as Error);
    return {
      success: false,
      error: 'Session expired, please login again',
      errorCode: 'UNAUTHORIZED'
    };
  }

  const accessToken = sessionData.session.access_token;
  const idempotencyKey = crypto.randomUUID();

  const url = `${SUPABASE_URL}/functions/v1/create-checkout-v3`;
  const body = JSON.stringify({
    booking_id: bookingId,
    return_url: `${window.location.origin}/messages`
  });

  sreLogger.info('Creating checkout session', { component: 'bookingService', bookingId, idempotencyKey });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Idempotency-Key': idempotencyKey,
        'Content-Type': 'application/json',
      },
      body
    });

    const responseData = await response.json();

    // Handle non-OK responses
    if (!response.ok) {
      sreLogger.error('Checkout error response', { component: 'bookingService', status: response.status, responseData });
      
      const errorMessage = responseData?.error || responseData?.message || 'Checkout failed';
      
      if (response.status === 401) {
        return {
          success: false,
          error: 'Session expired, please login again',
          errorCode: 'UNAUTHORIZED'
        };
      }
      
      if (response.status === 400) {
        return {
          success: false,
          error: errorMessage,
          errorCode: 'INVALID_REQUEST'
        };
      }
      
      return {
        success: false,
        error: errorMessage,
        errorCode: 'SERVER_ERROR'
      };
    }

    // Extract checkout URL from successful response
    // Response format: { checkout_session: { url: "..." }, ... }
    const checkoutUrl = responseData?.checkout_session?.url || responseData?.url;
    const sessionId = responseData?.checkout_session?.id;

    if (!checkoutUrl) {
      sreLogger.error('No checkout URL in response', { component: 'bookingService', responseData });
      return {
        success: false,
        error: 'No checkout URL returned from payment service',
        errorCode: 'SERVER_ERROR'
      };
    }

    sreLogger.info('Checkout session created successfully', { component: 'bookingService', sessionId });

    return {
      success: true,
      url: checkoutUrl,
      sessionId
    };

  } catch (error) {
    sreLogger.error('Network error during checkout', { component: 'bookingService' }, error as Error);
    return {
      success: false,
      error: 'Connection failed, please check your internet',
      errorCode: 'NETWORK'
    };
  }
}

// ============= GET BOOKINGS FOR SPACE =============

/**
 * Fetches all active bookings for a specific space.
 * Used by the availability scheduler to detect conflicts.
 * 
 * @param spaceId - The space ID to fetch bookings for
 * @returns Result with bookings on success, or error details on failure
 */
export async function getBookingsForSpace(spaceId: string): Promise<GetSpaceBookingsResult> {
  if (!spaceId) {
    return { success: false, error: 'Space ID is required' };
  }

  sreLogger.info('Fetching bookings for space', { component: 'bookingService', spaceId });

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, booking_date, start_time, end_time, status, guests_count, user_id')
      .eq('space_id', spaceId)
      .in('status', ['pending', 'confirmed'])
      .is('deleted_at', null)
      .gte('booking_date', new Date().toISOString().split('T')[0]) // Only future bookings
      .order('booking_date', { ascending: true });

    if (error) {
      sreLogger.error('Error fetching space bookings', { component: 'bookingService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true, bookings: (data || []) as SpaceBooking[] };
  } catch (err) {
    sreLogger.error('Exception fetching space bookings', { component: 'bookingService' }, err as Error);
    return { success: false, error: 'Failed to fetch bookings' };
  }
}
