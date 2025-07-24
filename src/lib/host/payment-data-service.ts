import { supabase } from "@/integrations/supabase/client";

export interface PaymentStats {
  availableBalance: number;
  pendingPayouts: number;
  thisMonthEarnings: number;
  lastPayoutDate: string | null;
  totalRevenue: number;
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

export interface TransactionData {
  id: string;
  date: string;
  guestName: string;
  spaceName: string;
  amount: number;
  status: 'completed' | 'pending' | 'disputed';
  paymentMethod: 'card' | 'bank_transfer';
}

// Mapping Transaction to TransactionData format
export const mapTransactionToTransactionData = (transaction: Transaction): TransactionData => ({
  id: transaction.id,
  date: transaction.date,
  guestName: transaction.customer || 'Guest sconosciuto',
  spaceName: transaction.description,
  amount: transaction.amount,
  status: transaction.status as 'completed' | 'pending' | 'disputed',
  paymentMethod: 'card' as const
});

export interface PayoutData {
  id: string;
  amount: number;
  date: string;
  status: 'scheduled' | 'pending';
}

export const getHostPaymentStats = async (hostId: string): Promise<PaymentStats> => {
  try {
    // Get all payments for host's spaces
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        bookings!inner (
          space_id,
          spaces!inner (
            host_id
          )
        )
      `)
      .eq('bookings.spaces.host_id', hostId)
      .eq('payment_status', 'completed');

    if (error) throw error;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Calculate totals
    const totalEarnings = payments?.reduce((sum, payment) => sum + (payment.host_amount || 0), 0) || 0;
    const thisMonthEarnings = payments?.filter(payment => {
      if (!payment.created_at) return false;
      const paymentDate = new Date(payment.created_at);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    }).reduce((sum, payment) => sum + (payment.host_amount || 0), 0) || 0;

    // Mock calculations for demo (in real app, these would come from Stripe)
    const availableBalance = totalEarnings * 0.3; // 30% available
    const pendingPayouts = totalEarnings * 0.2; // 20% pending
    
    // Get last payout date (mock)
    const lastPayoutDate = payments?.length && payments[0]?.created_at 
      ? payments[0].created_at.split('T')[0] 
      : null;

    return {
      availableBalance: Math.round(availableBalance),
      pendingPayouts: Math.round(pendingPayouts),
      thisMonthEarnings: Math.round(thisMonthEarnings),
      lastPayoutDate: lastPayoutDate || null,
      totalRevenue: Math.round(totalEarnings)
    };

  } catch (error) {
    console.error('Error fetching payment stats:', error);
    return {
      availableBalance: 0,
      pendingPayouts: 0,
      thisMonthEarnings: 0,
      lastPayoutDate: null,
      totalRevenue: 0
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

    return payments
      ?.filter(payment => payment.created_at && payment.host_amount)
      ?.map(payment => ({
        id: payment.id,
        type: 'earning' as const,
        description: `Prenotazione ${payment.bookings?.spaces?.title || 'Spazio'}`,
        amount: payment.host_amount!,
        date: payment.created_at!.split('T')[0],
        status: 'completed',
        customer: payment.bookings?.profiles 
          ? `${payment.bookings.profiles.first_name} ${payment.bookings.profiles.last_name}`
          : 'Guest sconosciuto',
        booking_id: payment.booking_id
      })) || [];

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
};

export const getUpcomingPayouts = async (hostId: string): Promise<PayoutData[]> => {
  try {
    // Get payment stats first
    const stats = await getHostPaymentStats(hostId);
    
    // Mock upcoming payouts (in real app, this would come from Stripe)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const payouts: PayoutData[] = stats.pendingPayouts > 0 ? [
      {
        id: '1',
        amount: stats.pendingPayouts,
        date: nextWeek.toISOString().split('T')[0],
        status: 'scheduled'
      }
    ] : [];

    return payouts;

  } catch (error) {
    console.error('Error fetching upcoming payouts:', error);
    return [];
  }
};