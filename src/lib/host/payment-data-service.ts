import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

const getString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

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
      sreLogger.error('Error fetching host metrics', { 
        context: 'getHostPaymentStats',
        hostId 
      }, metricsError as Error);
      throw metricsError;
    }

    const metrics = isRecord(hostMetrics) ? hostMetrics : {};
    
    // Calcoli basati sulle metriche sicure
    const totalRevenue = getNumber(metrics['totalRevenue']) || 0;
    const monthlyRevenue = getNumber(metrics['monthlyRevenue']) || 0;
    
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
    sreLogger.error('Error fetching payment stats', { 
      context: 'getHostPaymentStats',
      hostId 
    }, error as Error);
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
    // Fix B.6: Use optimized RPC instead of nested JOINs (eliminates N+1 queries)
    const { data, error } = await supabase.rpc('get_host_transactions_optimized', {
      host_id_param: hostId,
      limit_param: 20
    });

    if (error) throw error;

    if (!data) return [];

    // Transform RPC result to Transaction format
    const transactions: Transaction[] = Array.isArray(data)
      ? data.map((row: unknown) => {
      if (!isRecord(row)) {
        return null;
      }
      // Per pagamenti legacy con host_amount null, calcola come amount / 1.05 (rimuove il 5% fee del buyer)
      const hostAmount = getNumber(row['host_amount']) ?? (getNumber(row['amount']) ?? 0) / 1.05;
      const createdAt = getString(row['created_at']) || new Date().toISOString();
      const bookingId = getString(row['booking_id']);
      
      const transaction: Transaction = {
        id: getString(row['id']) || '',
        type: 'earning' as const,
        description: `Prenotazione ${getString(row['space_title']) || 'Spazio'}`,
        amount: hostAmount,
        date: createdAt.split('T')[0] || '',
        status: 'completed', // RPC returns only completed payments
        customer: getString(row['customer_name']) || 'Guest sconosciuto'
      };
      
      // Only add booking_id if it exists (avoid undefined)
      if (bookingId) {
        transaction.booking_id = bookingId;
      }
      
      return transaction;
    }).filter((row): row is Transaction => row !== null)
      : [];

    return transactions;

  } catch (error) {
    sreLogger.error('Error fetching transactions', { 
      context: 'getHostTransactions',
      hostId 
    }, error as Error);
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
    sreLogger.error('Error fetching upcoming payouts', { 
      context: 'getUpcomingPayouts',
      hostId 
    }, error as Error);
    return [];
  }
};
