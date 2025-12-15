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

export interface FiscalPaymentBreakdown {
  net_amount: number;
  platform_fee: number;
  vat_amount: number;
  gross_amount: number;
  withholding_tax: number;
}

export const hashSensitiveId = (id: string): string => {
  if (!id) return '';
  if (id.length <= 8) return '****';
  return `****${id.slice(-4)}`;
};

/**
 * Calculates payment breakdown according to Italian fiscal rules.
 *
 * Rules:
 * 1. Platform Fee: 5% of Base Amount
 * 2. IVA (VAT): 22% applied only to the Platform Fee
 * 3. Withholding Tax (Ritenuta): 21% of Base Amount (if host is private)
 * 4. Net Payout: Base Amount - (Platform Fee + IVA + Withholding Tax)
 */
export const calculatePaymentBreakdownWithTax = (
  baseAmount: number,
  isPrivateIndividual: boolean = false
): FiscalPaymentBreakdown => {
  const platformFee = Math.round(baseAmount * 0.05 * 100) / 100; // 5%
  const vatAmount = Math.round(platformFee * 0.22 * 100) / 100; // 22% on fee

  // Ritenuta d'acconto: 21% on Base Amount if host is private individual
  const withholdingTax = isPrivateIndividual
    ? Math.round(baseAmount * 0.21 * 100) / 100
    : 0;

  const netPayout = Math.round((baseAmount - platformFee - vatAmount - withholdingTax) * 100) / 100;

  return {
    gross_amount: baseAmount,
    platform_fee: platformFee,
    vat_amount: vatAmount,
    withholding_tax: withholdingTax,
    net_amount: netPayout
  };
};

// Calculate payment breakdown with dual commission model
// @deprecated Use calculatePaymentBreakdownWithTax for fiscal compliance
export const calculatePaymentBreakdown = (baseAmount: number) => {
  const breakdown = calculatePaymentBreakdownWithTax(baseAmount);
  
  // Mapping new logic to old structure for backward compatibility where needed
  // Note: Old logic had buyer fee + host fee. New logic focuses on Platform Fee (Host side).
  // We approximate to keep legacy consumers working without crashing, but values might differ slightly.
  
  return {
    baseAmount,
    buyerFeeAmount: 0, // No longer using buyer fee in this simplified model
    buyerTotalAmount: baseAmount,
    hostFeeAmount: breakdown.platform_fee,
    hostNetPayout: breakdown.net_amount,
    platformRevenue: breakdown.platform_fee
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
      bookingId: hashSensitiveId(bookingId),
      hostStripeAccountId: hashSensitiveId(hostStripeAccountId)
    });

    const { data, error } = await supabase.functions.invoke('create-checkout-v3', {
      body: {
        booking_id: bookingId,
        origin: window.location.origin
      }
    });

    if (error) {
      sreLogger.error('createPaymentSession - Edge function error', {
        component: 'PaymentUtils',
        action: 'createPaymentSession',
        bookingId: hashSensitiveId(bookingId),
        status: (error as any).status,
        message: (error as any).message
      }, error as Error);
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
    sreLogger.error("Error creating payment session", {
      component: 'PaymentUtils',
      action: 'createPaymentSession',
      bookingId: hashSensitiveId(bookingId)
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
      bookingId: hashSensitiveId(bookingId)
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
      bookingId: hashSensitiveId(paymentData.booking_id)
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
