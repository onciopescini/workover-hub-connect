import { supabase } from "@/integrations/supabase/client";
import { PaymentInsert, PaymentSession } from "@/types/payment";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

// Importa il tipo Payment dalla tabella Supabase
type Payment = {
  id: string;
  user_id: string;
  booking_id: string;
  amount: number;
  currency: string;
  payment_status: string;
  method?: string;
  receipt_url?: string;
  created_at: string;
};

// Interface for Supabase Edge Function errors
export interface SupabaseError extends Error {
  status?: number;
  message: string;
  code?: string;
  details?: unknown;
}

// Type guard for SupabaseError
const isSupabaseError = (error: unknown): error is SupabaseError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  );
};

// Calculate payment breakdown with dual commission model
export const calculatePaymentBreakdown = (baseAmount: number) => {
  const buyerFeeAmount = Math.round(baseAmount * 0.05 * 100) / 100; // 5% buyer fee
  const buyerTotalAmount = baseAmount + buyerFeeAmount;
  
  const hostFeeAmount = Math.round(baseAmount * 0.05 * 100) / 100; // 5% host fee
  const hostNetPayout = baseAmount - hostFeeAmount;
  
  const platformRevenue = buyerFeeAmount + hostFeeAmount;

  return {
    baseAmount,
    buyerFeeAmount,
    buyerTotalAmount,
    hostFeeAmount,
    hostNetPayout,
    platformRevenue
  };
};

// Create payment session for booking with dual commission model
export const createPaymentSession = async (
  bookingId: string,
  spaceId: string,
  durationHours: number,
  pricePerHour: number,
  pricePerDay: number,
  hostStripeAccountId: string,
  currency: string = "EUR"
): Promise<PaymentSession | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      toast.error("Devi essere autenticato per effettuare un pagamento");
      return null;
    }

    // Check if host has Stripe account configured
    if (!hostStripeAccountId) {
      toast.error("Host non collegato a Stripe", {
        description: "Impossibile procedere con il pagamento. Contatta il proprietario dello spazio."
      });
      return null;
    }

    sreLogger.debug('Creating payment session via create-checkout-v3', {
      component: 'PaymentUtils',
      action: 'createPaymentSession',
      bookingId,
      hostStripeAccountId
    });

    const { data, error } = await supabase.functions.invoke('create-checkout-v3', {
      body: {
        booking_id: bookingId,
        origin: window.location.origin
      }
    });

    if (error) {
      const supabaseError = error as SupabaseError;
      sreLogger.error('createPaymentSession - Edge function error', {
        component: 'PaymentUtils',
        action: 'createPaymentSession',
        bookingId,
        status: supabaseError.status,
        message: supabaseError.message,
        code: supabaseError.code
      }, supabaseError);
      throw error;
    }
    
    sreLogger.debug('createPaymentSession - Received data', {
      component: 'PaymentUtils',
      action: 'createPaymentSession',
      hasUrl: !!data?.url
    });
    
    if (!data?.url) {
      sreLogger.error('createPaymentSession - No URL in response', {
        component: 'PaymentUtils',
        action: 'createPaymentSession',
        data
      });
      throw new Error('URL di pagamento non ricevuto dal server');
    }
    
    return data as PaymentSession;
  } catch (error) {
    const errorDetails = isSupabaseError(error) ? {
      status: error.status,
      message: error.message,
      code: error.code
    } : { message: 'Unknown error' };

    sreLogger.error("Error creating payment session", {
      component: 'PaymentUtils',
      action: 'createPaymentSession',
      bookingId,
      ...errorDetails
    }, error as Error);

    toast.error("Errore nella creazione della sessione di pagamento");
    return null;
  }
};

// Get payment status
export const getPaymentStatus = async (bookingId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('payment_status')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    return data?.payment_status || null;
  } catch (error) {
    sreLogger.error("Error fetching payment status", {
      component: 'PaymentUtils',
      action: 'getPaymentStatus',
      bookingId
    }, error as Error);
    return null;
  }
};

// Get user payments
export const getUserPayments = async (): Promise<Payment[]> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return [];

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        bookings:booking_id(
          booking_date,
          spaces:space_id(title)
        )
      `)
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(payment => ({
      ...payment,
      method: payment.method ?? '',
      receipt_url: payment.receipt_url ?? '',
      created_at: payment.created_at ?? ''
    }));
  } catch (error) {
    const { data: user } = await supabase.auth.getUser();
    sreLogger.error("Error fetching user payments", {
      component: 'PaymentUtils',
      action: 'getUserPayments',
      userId: user?.user?.id
    }, error as Error);
    return [];
  }
};

// Record payment in database
export const recordPayment = async (paymentData: Omit<PaymentInsert, 'user_id'>): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return false;

    const { error } = await supabase
      .from('payments')
      .insert({
        ...paymentData,
        user_id: user.user.id
      });

    if (error) throw error;
    return true;
  } catch (error) {
    const { data: user } = await supabase.auth.getUser();
    sreLogger.error("Error recording payment", {
      component: 'PaymentUtils',
      action: 'recordPayment',
      userId: user?.user?.id,
      bookingId: paymentData.booking_id
    }, error as Error);
    return false;
  }
};

// Validate payment completion
export const validatePayment = async (sessionId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('validate-payment', {
      body: { session_id: sessionId }
    });

    if (error) throw error;
    
    return data?.success || false;
  } catch (error) {
    sreLogger.error("Error validating payment", {
      component: 'PaymentUtils',
      action: 'validatePayment',
      sessionId
    }, error as Error);
    return false;
  }
};
