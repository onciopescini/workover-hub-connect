/**
 * Booking Service Layer
 * 
 * Handles all booking-related API calls with proper error handling,
 * idempotency, and type safety.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

// Supabase project constants (no VITE_* env vars in services)
const SUPABASE_URL = 'https://khtqwzvrxzsgfhsslwyz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodHF3enZyeHpzZ2Zoc3Nsd3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDg0ODUsImV4cCI6MjA2MzUyNDQ4NX0.QThCoBfb0JuFZ5dLru-TNSA_B0PZqp8AL0x0yaEWNFk';

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
}

export interface CreateCheckoutSessionResult {
  success: boolean;
  url?: string;
  sessionId?: string;
  error?: string;
  errorCode?: 'UNAUTHORIZED' | 'INVALID_REQUEST' | 'NETWORK' | 'SERVER_ERROR';
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
        'apikey': SUPABASE_ANON_KEY
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
