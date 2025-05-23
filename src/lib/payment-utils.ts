
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PaymentWithDetails, PaymentInsert } from "@/types/payment";

// Get payments for current user
export const getUserPayments = async (): Promise<PaymentWithDetails[]> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return [];

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        booking:booking_id (
          booking_date,
          space:space_id (
            title,
            address
          )
        )
      `)
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data as PaymentWithDetails[] || [];
  } catch (error) {
    console.error("Error fetching payments:", error);
    return [];
  }
};

// Create a new payment record
export const createPayment = async (payment: PaymentInsert): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('payments')
      .insert(payment);

    if (error) {
      toast.error("Failed to create payment record");
      console.error(error);
      return false;
    }

    toast.success("Payment recorded successfully");
    return true;
  } catch (error) {
    console.error("Error creating payment:", error);
    toast.error("Failed to create payment record");
    return false;
  }
};

// Update payment status
export const updatePaymentStatus = async (
  paymentId: string, 
  status: string, 
  receiptUrl?: string
): Promise<boolean> => {
  try {
    const updateData: any = { payment_status: status };
    if (receiptUrl) updateData.receipt_url = receiptUrl;

    const { error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId);

    if (error) {
      toast.error("Failed to update payment status");
      console.error(error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating payment status:", error);
    toast.error("Failed to update payment status");
    return false;
  }
};
