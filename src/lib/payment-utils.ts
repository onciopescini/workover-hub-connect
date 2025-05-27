
import { supabase } from "@/integrations/supabase/client";
import { PaymentInsert, PaymentSession } from "@/types/payment";
import { toast } from "sonner";

// Create payment session for booking
export const createPaymentSession = async (
  bookingId: string,
  amount: number,
  currency: string = "EUR"
): Promise<PaymentSession | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      toast.error("Devi essere autenticato per effettuare un pagamento");
      return null;
    }

    const { data, error } = await supabase.functions.invoke('create-payment-session', {
      body: {
        booking_id: bookingId,
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        user_id: user.user.id
      }
    });

    if (error) throw error;
    
    return data as PaymentSession;
  } catch (error) {
    console.error("Error creating payment session:", error);
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
    console.error("Error fetching payment status:", error);
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
    return data || [];
  } catch (error) {
    console.error("Error fetching user payments:", error);
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
    console.error("Error recording payment:", error);
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
    console.error("Error validating payment:", error);
    return false;
  }
};
