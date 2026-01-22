
import { supabase } from "@/integrations/supabase/client";
import { createUtcIsoString, nowUtc } from "@/lib/date-time";
import { SlotReservationResult } from "@/types/booking";
import { createPaymentSession } from "@/lib/payment-utils";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

// Type guard per validare SlotReservationResult
function isSlotReservationResult(data: unknown): data is SlotReservationResult {
  if (typeof data !== 'object' || data === null) return false;
  
  const obj = data as any;
  return (
    'success' in obj &&
    typeof obj.success === 'boolean' &&
    (!('error' in obj) || obj.error === undefined || typeof obj.error === 'string') &&
    (!('booking_id' in obj) || obj.booking_id === undefined || typeof obj.booking_id === 'string') &&
    (!('reservation_token' in obj) || obj.reservation_token === undefined || typeof obj.reservation_token === 'string') &&
    (!('reserved_until' in obj) || obj.reserved_until === undefined || typeof obj.reserved_until === 'string') &&
    (!('space_title' in obj) || obj.space_title === undefined || typeof obj.space_title === 'string') &&
    (!('confirmation_type' in obj) || obj.confirmation_type === undefined || typeof obj.confirmation_type === 'string')
  );
}

export const reserveBookingSlot = async (
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string,
  confirmationType: string = 'instant',
  bufferMinutes: number = 0,
  slotInterval: number = 30,
  guestsCount: number = 1,
  clientBasePrice?: number // Optional: for server-side price validation
): Promise<SlotReservationResult | null> => {
  try {
    sreLogger.info('Starting booking reservation', {
      component: 'booking-reservation-utils',
      action: 'reserve_slot',
      spaceId,
      date,
      startTime,
      endTime,
      confirmationType
    });

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      sreLogger.warn('User not authenticated for booking', {
        component: 'booking-reservation-utils',
        action: 'reserve_slot'
      });
      toast.error("Devi essere autenticato per prenotare");
      return null;
    }

    sreLogger.info('Calling validate_and_reserve_slot RPC', {
      component: 'booking-reservation-utils',
      action: 'rpc_call',
      spaceId
    });

    const { data, error } = await supabase.rpc('validate_and_reserve_slot', {
      space_id_param: spaceId,
      date_param: date,
      start_time_param: startTime,
      end_time_param: endTime,
      user_id_param: user.user.id,
      guests_count_param: guestsCount,
      confirmation_type_param: confirmationType,
      client_base_price_param: clientBasePrice // Pass client-calculated price for validation
    } as any);

    if (error) {
      sreLogger.error('RPC error during slot reservation', {
        component: 'booking-reservation-utils',
        action: 'rpc_error',
        spaceId,
        date
      }, error instanceof Error ? error : new Error(String(error)));
      
      // Provide more specific error messages
      let errorMessage = "Errore nella prenotazione dello slot";
      if (error.message?.includes('not available')) {
        errorMessage = "Lo spazio non è disponibile o l'host non ha collegato Stripe";
      } else if (error.message?.includes('not available')) {
        errorMessage = "L'orario selezionato non è disponibile";
      } else if (error.message?.includes('conflict')) {
        errorMessage = "C'è un conflitto con un'altra prenotazione";
      }
      
      toast.error(errorMessage);
      return null;
    }

    sreLogger.info('RPC response received', {
      component: 'booking-reservation-utils',
      action: 'rpc_success',
      hasData: !!data
    });

    // Valida la struttura della risposta con il type guard
    if (!isSlotReservationResult(data)) {
      sreLogger.error('Invalid response structure from RPC', {
        component: 'booking-reservation-utils',
        action: 'response_validation',
        dataType: typeof data
      }, new Error('Invalid RPC response structure'));
      toast.error("Errore nel formato della risposta del server");
      return null;
    }

    if (!data.success) {
      sreLogger.warn('Reservation failed', {
        component: 'booking-reservation-utils',
        action: 'reservation_failed',
        error: data.error
      });
      toast.error(data.error || "Errore nella prenotazione");
      return null;
    }

    sreLogger.info('Reservation successful', {
      component: 'booking-reservation-utils',
      action: 'reservation_success',
      bookingId: data.booking_id
    });
    return data;

  } catch (error) {
    sreLogger.error('Unexpected error during reservation', {
      component: 'booking-reservation-utils',
      action: 'reserve_slot'
    }, error instanceof Error ? error : new Error(String(error)));
    toast.error("Errore imprevisto nella prenotazione");
    return null;
  }
};

export const calculateBookingTotal = (pricePerDay: number, startTime: string, endTime: string): number => {
  try {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    // Assuming 8-hour workday for daily pricing
    const total = Math.round((hours * (pricePerDay / 8)) * 100) / 100;
    
    sreLogger.info('Booking total calculated', {
      component: 'booking-reservation-utils',
      action: 'calculate_total',
      pricePerDay,
      startTime,
      endTime,
      hours,
      total
    });
    
    return total;
  } catch (error) {
    sreLogger.error('Error calculating booking total', {
      component: 'booking-reservation-utils',
      action: 'calculate_total',
      pricePerDay,
      startTime,
      endTime
    }, error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
};

export const handlePaymentFlow = async (
  bookingId: string,
  spaceId: string,
  durationHours: number,
  pricePerHour: number,
  pricePerDay: number,
  hostStripeAccountId: string,
  onSuccess: () => void,
  onError: (message: string) => void
) => {
  try {
    // Guard: check if host has Stripe account
    if (!hostStripeAccountId) {
      sreLogger.error('Host not connected to Stripe', {
        component: 'booking-reservation-utils',
        action: 'payment_flow',
        spaceId
      }, new Error('HOST_STRIPE_ACCOUNT_MISSING'));
      toast.error('Host non collegato a Stripe', {
        description: 'Impossibile procedere con il pagamento. Contatta il proprietario dello spazio.',
      });
      onError('HOST_STRIPE_ACCOUNT_MISSING');
      return;
    }

    sreLogger.info('Initiating payment flow', {
      component: 'booking-reservation-utils',
      action: 'payment_flow',
      bookingId,
      spaceId,
      durationHours
    });
    
    const paymentSession = await createPaymentSession(
      bookingId, 
      spaceId, 
      durationHours, 
      pricePerHour, 
      pricePerDay, 
      hostStripeAccountId
    );
    
    if (!paymentSession) {
      sreLogger.error('Failed to create payment session', {
        component: 'booking-reservation-utils',
        action: 'payment_flow',
        bookingId
      }, new Error('Payment session creation failed'));
      onError("Errore nella creazione della sessione di pagamento");
      return;
    }

    sreLogger.info('Payment session created', {
      component: 'booking-reservation-utils',
      action: 'payment_session_created',
      sessionId: paymentSession.session_id,
      hasUrl: !!paymentSession.url
    });
    
    // Store session ID in booking for tracking
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ payment_session_id: paymentSession.session_id })
      .eq('id', bookingId);

    if (updateError) {
      sreLogger.warn('Failed to update booking with session ID', {
        component: 'booking-reservation-utils',
        action: 'update_booking',
        bookingId,
        error: updateError.message
      });
    }

    sreLogger.info('Redirecting to Stripe Checkout', {
      component: 'booking-reservation-utils',
      action: 'redirect_to_stripe',
      url: paymentSession.url
    });
    
    // Redirect to Stripe Checkout
    window.location.href = paymentSession.url;
    
  } catch (error) {
    sreLogger.error('Error in payment flow', {
      component: 'booking-reservation-utils',
      action: 'payment_flow',
      bookingId
    }, error instanceof Error ? error : new Error(String(error)));
    onError("Errore nel flusso di pagamento");
  }
};

export const reserveMultipleSlots = async (
  spaceId: string,
  slots: Array<{ date: string; startTime: string; endTime: string }>,
  guestsCount: number = 1,
  confirmationType: string = 'instant',
  clientTotalPrice?: number
): Promise<{ success: boolean; bookingIds?: string[]; error?: string; reservationToken?: string } | null> => {
  try {
    sreLogger.info('Starting multi-slot booking reservation', {
      component: 'booking-reservation-utils',
      action: 'reserve_multi_slots',
      spaceId,
      slotsCount: slots.length,
      confirmationType
    });

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      sreLogger.warn('User not authenticated for multi-slot booking', {
        component: 'booking-reservation-utils',
        action: 'reserve_multi_slots'
      });
      toast.error("Devi essere autenticato per prenotare");
      return null;
    }

    // Format slots for RPC
    const slotsParam = slots.map(slot => ({
      date: slot.date,
      start_time: slot.startTime,
      end_time: slot.endTime
    }));

    sreLogger.info('Calling validate_and_reserve_multi_slots RPC', {
      component: 'booking-reservation-utils',
      action: 'rpc_call',
      spaceId,
      slotsCount: slots.length
    });

    const { data, error } = await supabase.rpc('validate_and_reserve_multi_slots', {
      space_id_param: spaceId,
      slots_param: slotsParam,
      user_id_param: user.user.id,
      guests_count_param: guestsCount,
      confirmation_type_param: confirmationType,
      client_total_price_param: clientTotalPrice
    } as any);

    if (error) {
      sreLogger.error('RPC error during multi-slot reservation', {
        component: 'booking-reservation-utils',
        action: 'rpc_error',
        spaceId
      }, error instanceof Error ? error : new Error(String(error)));
      
      let errorMessage = "Errore nella prenotazione multi-slot";
      if (error.message?.includes('not available')) {
        errorMessage = "Lo spazio non è disponibile o l'host non ha collegato Stripe";
      } else if (error.message?.includes('conflict')) {
        errorMessage = "C'è un conflitto con un'altra prenotazione";
      } else if (error.message?.includes('Capacity exceeded')) {
        errorMessage = "Capacità superata in uno degli slot selezionati";
      } else if (error.message?.includes('Price mismatch')) {
        errorMessage = "Errore di validazione prezzo. Riprova.";
      }
      
      toast.error(errorMessage);
      return null;
    }

    if (!data || typeof data !== 'object') {
      sreLogger.error('Invalid response from multi-slot RPC', {
        component: 'booking-reservation-utils',
        action: 'response_validation'
      }, new Error('Invalid RPC response'));
      toast.error("Errore nel formato della risposta del server");
      return null;
    }

    const result = data as any;
    
    if (!result.success) {
      sreLogger.warn('Multi-slot reservation failed', {
        component: 'booking-reservation-utils',
        action: 'reservation_failed',
        error: result.error
      });
      toast.error(result.error || "Errore nella prenotazione multi-slot");
      return { success: false, error: result.error };
    }

    sreLogger.info('Multi-slot reservation successful', {
      component: 'booking-reservation-utils',
      action: 'reservation_success',
      bookingIds: result.booking_ids,
      totalSlots: result.total_slots
    });

    return {
      success: true,
      bookingIds: result.booking_ids,
      reservationToken: result.reservation_token
    };

  } catch (error) {
    sreLogger.error('Unexpected error during multi-slot reservation', {
      component: 'booking-reservation-utils',
      action: 'reserve_multi_slots'
    }, error instanceof Error ? error : new Error(String(error)));
    toast.error("Errore imprevisto nella prenotazione multi-slot");
    return null;
  }
};

export const getSpacesWithConnectedHosts = async () => {
  try {
    const { data, error } = await supabase
      .from('spaces')
      .select(`
        *,
        title:name,
        profiles!spaces_owner_id_fkey (
          stripe_connected,
          first_name,
          last_name
        )
      `)
      .eq('published', true)
      // .eq('is_suspended', false) // is_suspended not in workspaces, rely on published
      .eq('profiles.stripe_connected', true);

    if (error) {
      sreLogger.error('Error fetching spaces with connected hosts', {
        component: 'booking-reservation-utils',
        action: 'fetch_connected_hosts'
      }, error instanceof Error ? error : new Error(String(error)));
      return [];
    }

    return data || [];
  } catch (error) {
    sreLogger.error('Unexpected error fetching spaces', {
      component: 'booking-reservation-utils',
      action: 'fetch_connected_hosts'
    }, error instanceof Error ? error : new Error(String(error)));
    return [];
  }
};
