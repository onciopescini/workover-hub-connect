import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StripePayoutData {
  available_balance: number;
  pending_balance: number;
  currency: string;
  last_payout: {
    amount: number;
    arrival_date: string;
    status: string;
  } | null;
  next_payout: {
    amount: number;
    date: string;
  } | null;
}

export const useStripePayouts = (hostId: string) => {
  return useQuery<StripePayoutData>({
    queryKey: ['stripe-payouts', hostId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-stripe-payouts', {
        body: { host_id: hostId }
      });
      
      if (error) throw error;
      return data as StripePayoutData;
    },
    enabled: !!hostId,
    refetchInterval: 60000, // Refresh every 60s
    staleTime: 30000
  });
};
