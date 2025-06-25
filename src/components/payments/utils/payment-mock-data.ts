
import { PaymentData, TransactionData, PayoutData, MonthlyForecast } from '../types/payment-hub-types';

export const getMockPaymentData = (): PaymentData => ({
  totalRevenue: 12450.80,
  pendingPayments: 3,
  completedPayments: 47,
  disputedPayments: 1,
  nextPayoutDate: '2025-01-15',
  nextPayoutAmount: 2340.50
});

export const getMockRecentTransactions = (): TransactionData[] => [
  {
    id: '1',
    date: '2025-01-10',
    guestName: 'Marco Rossi',
    spaceName: 'Ufficio Privato Centro',
    amount: 120.00,
    status: 'completed',
    paymentMethod: 'card'
  },
  {
    id: '2',
    date: '2025-01-09',
    guestName: 'Laura Bianchi',
    spaceName: 'Sala Riunioni Executive',
    amount: 85.00,
    status: 'pending',
    paymentMethod: 'bank_transfer'
  },
  {
    id: '3',
    date: '2025-01-08',
    guestName: 'Andrea Verdi',
    spaceName: 'Postazione Desk',
    amount: 45.00,
    status: 'disputed',
    paymentMethod: 'card'
  }
];

export const getMockMonthlyForecast = (): MonthlyForecast[] => [
  { month: 'Gen', projected: 3500, actual: 3200 },
  { month: 'Feb', projected: 4000, actual: 4200 },
  { month: 'Mar', projected: 3800, actual: 3600 },
  { month: 'Apr', projected: 4500, actual: null },
  { month: 'Mag', projected: 5000, actual: null }
];
