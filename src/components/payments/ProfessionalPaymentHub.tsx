
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentStatsHeader } from './components/PaymentStatsHeader';
import { PaymentOverviewTab } from './components/PaymentOverviewTab';
import { PaymentTransactionsTab } from './components/PaymentTransactionsTab';
import { PaymentForecastingTab } from './components/PaymentForecastingTab';
import { PaymentReportsTab } from './components/PaymentReportsTab';
import { useAuth } from '@/hooks/auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getHostPaymentStats, getHostTransactions, getUpcomingPayouts } from '@/lib/host/payment-data-service';

export const ProfessionalPaymentHub: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const { authState } = useAuth();
  
  // Fetch real payment data
  const { data: paymentData, isLoading: statsLoading } = useQuery({
    queryKey: ['host-payment-stats', authState.user?.id],
    queryFn: () => getHostPaymentStats(authState.user?.id || ''),
    enabled: !!authState.user?.id,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['host-transactions', authState.user?.id],
    queryFn: () => getHostTransactions(authState.user?.id || ''),
    enabled: !!authState.user?.id,
  });

  const { data: upcomingPayouts } = useQuery({
    queryKey: ['upcoming-payouts', authState.user?.id],
    queryFn: () => getUpcomingPayouts(authState.user?.id || ''),
    enabled: !!authState.user?.id,
  });

  // Generate monthly forecast from real data
  const monthlyForecast = paymentData ? [
    { month: 'Gen', projected: paymentData.thisMonthEarnings * 1.1, actual: paymentData.thisMonthEarnings },
    { month: 'Feb', projected: paymentData.thisMonthEarnings * 1.2, actual: null },
    { month: 'Mar', projected: paymentData.thisMonthEarnings * 1.15, actual: null },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <PaymentStatsHeader paymentData={paymentData} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="transactions">Transazioni</TabsTrigger>
          <TabsTrigger value="forecasting">Previsioni</TabsTrigger>
          <TabsTrigger value="reports">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <PaymentOverviewTab paymentData={paymentData} />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <PaymentTransactionsTab transactions={transactions || []} />
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-6">
          <PaymentForecastingTab monthlyForecast={monthlyForecast} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <PaymentReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
