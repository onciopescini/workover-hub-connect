
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentStatsHeader } from './components/PaymentStatsHeader';
import { PaymentOverviewTab } from './components/PaymentOverviewTab';
import { PaymentTransactionsTab } from './components/PaymentTransactionsTab';
import { PaymentForecastingTab } from './components/PaymentForecastingTab';
import { PaymentReportsTab } from './components/PaymentReportsTab';
import { 
  getMockPaymentData, 
  getMockRecentTransactions, 
  getMockMonthlyForecast 
} from './utils/payment-mock-data';

export const ProfessionalPaymentHub: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  
  // Mock data
  const paymentData = getMockPaymentData();
  const recentTransactions = getMockRecentTransactions();
  const monthlyForecast = getMockMonthlyForecast();

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
          <PaymentTransactionsTab transactions={recentTransactions} />
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
