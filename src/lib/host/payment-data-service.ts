import { supabase } from "@/integrations/supabase/client";

export interface PaymentStats {
  availableBalance: number;
  pendingPayouts: number;
  thisMonthEarnings: number;
  lastPayoutDate: string | null;
}

export interface Transaction {
  id: string;
  type: 'earning' | 'payout';
  description: string;
  amount: number;
  date: string;
  status: string;
  customer?: string;
  booking_id?: string;
}

export interface UpcomingPayout {
  id: string;
  amount: number;
  date: string;
  status: string;
}

export const getHostPaymentStats = async (hostId: string): Promise<PaymentStats> => {
  try {
    // Get completed payments for this host
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        bookings!inner (
          spaces!inner (
            host_id
          )
        )
      `)
      .eq('bookings.spaces.host_id', hostId)
      .eq('payment_status', 'completed');

    if (paymentsError) throw paymentsError;

    // Calculate total available balance (simplified - would need payout tracking)
    const totalEarnings = payments?.reduce((sum, payment) => sum + (payment.host_amount || 0), 0) || 0;
    
    // Estimate pending payouts (15% of total earnings as example)
    const pendingPayouts = totalEarnings * 0.15;
    const availableBalance = totalEarnings - pendingPayouts;

    // Calculate this month's earnings
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthPayments = payments?.filter(payment => {
      if (!payment.created_at) return false;
      const paymentDate = new Date(payment.created_at);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    }) || [];
    
    const thisMonthEarnings = thisMonthPayments.reduce((sum, payment) => sum + (payment.host_amount || 0), 0);

    // Get last payout date (simplified - would need actual payout records)
    const lastPayment = payments?.[0];
    const lastPayoutDate = lastPayment && lastPayment.created_at 
      ? new Date(lastPayment.created_at).toISOString().split('T')[0] 
      : null;

    return {
      availableBalance: Math.round(availableBalance),
      pendingPayouts: Math.round(pendingPayouts),
      thisMonthEarnings: Math.round(thisMonthEarnings),
      lastPayoutDate: lastPayoutDate || null
    };

  } catch (error) {
    console.error('Error fetching payment stats:', error);
    return {
      availableBalance: 0,
      pendingPayouts: 0,
      thisMonthEarnings: 0,
      lastPayoutDate: null
    };
  }
};

export const getHostTransactions = async (hostId: string): Promise<Transaction[]> => {
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        bookings!inner (
          space_id,
          spaces!inner (
            host_id,
            title
          ),
          profiles (
            first_name,
            last_name
          )
        )
      `)
      .eq('bookings.spaces.host_id', hostId)
      .eq('payment_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return payments?.map(payment => ({
      id: payment.id,
      type: 'earning' as const,
      description: `Prenotazione ${payment.bookings?.spaces?.title || 'Spazio'}`,
      amount: payment.host_amount || 0,
      date: payment.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      status: 'completed',
      customer: payment.bookings?.profiles 
        ? `${payment.bookings.profiles.first_name} ${payment.bookings.profiles.last_name}`
        : undefined,
      booking_id: payment.booking_id
    })) || [];

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
};

export const getUpcomingPayouts = async (hostId: string): Promise<UpcomingPayout[]> => {
  try {
    // This is a simplified implementation
    // In a real app, you'd have a payouts table or schedule
    const stats = await getHostPaymentStats(hostId);
    
    if (stats.pendingPayouts > 0) {
      // Generate mock upcoming payouts based on pending amount
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      return [
        {
          id: '1',
          amount: stats.pendingPayouts,
          date: nextWeek.toISOString().split('T')[0],
          status: 'scheduled'
        }
      ];
    }

    return [];

  } catch (error) {
    console.error('Error fetching upcoming payouts:', error);
    return [];
  }
};