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
    // Usa la funzione database sicura per le metriche di base
    const { data: hostMetrics, error: metricsError } = await supabase.rpc('get_host_metrics', {
      host_id_param: hostId
    });

    if (metricsError) {
      console.error('Error fetching host metrics:', metricsError);
      throw metricsError;
    }

    const metrics = hostMetrics as any;
    
    // Calcoli basati sulle metriche sicure
    const totalRevenue = metrics?.totalRevenue || 0;
    const monthlyRevenue = metrics?.monthlyRevenue || 0;
    
    // Mock calculations per saldo e payouts (in un'app reale verrebbero da Stripe)
    const availableBalance = totalRevenue * 0.3; // 30% disponibile
    const pendingPayouts = totalRevenue * 0.2; // 20% in attesa di payout
    
    // Data ultimo payout (mock - in realtà andrebbe gestita separatamente)
    const lastPayoutDate: string | null = totalRevenue > 0 ? new Date().toISOString().split('T')[0] || null : null;

    return {
      availableBalance: Math.round(availableBalance),
      pendingPayouts: Math.round(pendingPayouts),
      thisMonthEarnings: Math.round(monthlyRevenue),
      lastPayoutDate,
      totalRevenue: Math.round(totalRevenue)
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
        id,
        amount,
        created_at,
        host_amount,
        payment_status,
        booking_id,
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
      .not('created_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!payments) return [];

    const transactions: Transaction[] = [];
    
    for (const payment of payments) {
      if (payment.created_at && typeof payment.created_at === 'string') {
        // Per pagamenti legacy con host_amount null, calcola come amount / 1.05 (rimuove il 5% fee del buyer)
        const hostAmount = payment.host_amount ?? (payment.amount / 1.05);
        
        transactions.push({
          id: payment.id,
          type: 'earning' as const,
          description: `Prenotazione ${payment.bookings?.spaces?.title || 'Spazio'}`,
          amount: hostAmount,
          date: payment.created_at.split('T')[0] as string,
          status: 'completed', // Solo pagamenti completed
          customer: payment.bookings?.profiles 
            ? `${payment.bookings.profiles.first_name} ${payment.bookings.profiles.last_name}`
            : 'Guest sconosciuto',
          booking_id: payment.booking_id
        });
      }
    }

    return transactions;

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
    const dateString = nextWeek.toISOString().split('T')[0];
    
    const payouts: PayoutData[] = stats.pendingPayouts > 0 && dateString ? [
      {
        id: '1',
        amount: stats.pendingPayouts,
        date: dateString,
        status: 'scheduled' as const
      }
    ] : [];

    return payouts;

  } catch (error) {
    console.error('Error fetching upcoming payouts:', error);
    return [];
  }
};