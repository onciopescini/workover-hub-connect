
export interface PaymentData {
  totalRevenue: number;
  pendingPayments: number;
  completedPayments: number;
  disputedPayments: number;
  nextPayoutDate: string;
  nextPayoutAmount: number;
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

export interface PayoutData {
  id: string;
  amount: number;
  date: string;
  status: 'scheduled' | 'pending';
}

export interface MonthlyForecast {
  month: string;
  projected: number;
  actual: number | null;
}
