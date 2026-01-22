import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminPayments() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          booking:bookings(
            id,
            booking_date,
            space:spaces(id, title:name),
            coworker:profiles!bookings_user_id_fkey(id, first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    }
  });

  // Detect anomalies
  const anomalies = payments?.filter(payment => {
    // Check for missing host_amount or platform_fee when payment is completed
    if (payment.payment_status === 'completed') {
      if (!payment.host_amount || !payment.platform_fee) {
        return true;
      }
      
      // Check if amounts don't add up correctly (allowing small rounding differences)
      const expectedTotal = Number(payment.host_amount) + Number(payment.platform_fee);
      const actualTotal = Number(payment.amount);
      if (Math.abs(expectedTotal - actualTotal) > 0.02) {
        return true;
      }
    }
    
    return false;
  }).map(payment => ({
    ...payment,
    reason: !payment.host_amount || !payment.platform_fee 
      ? "Missing breakdown amounts"
      : "Amount mismatch"
  }));

  return { payments, anomalies, isLoading };
}
