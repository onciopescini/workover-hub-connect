
import React from 'react';
import { FinancialMetricsCards } from './components/FinancialMetricsCards';
import { FinancialMetricsCharts } from './components/FinancialMetricsCharts';
import { FinancialMetricsInsights } from './components/FinancialMetricsInsights';
import { FinancialMetricsProps } from './types/financial-metrics-types';
import { useAuth } from '@/hooks/auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getHostFinancialMetrics } from '@/lib/host/financial-metrics-service';
import { TIME_CONSTANTS } from "@/constants";

export const AdvancedFinancialMetrics: React.FC<FinancialMetricsProps> = ({
  totalRevenue,
  monthlyRevenue,
  revenueGrowth,
  averageBookingValue,
  occupancyRate
}) => {
  const { authState } = useAuth();
  
  // Fetch real financial metrics from Supabase
  const { data: financialMetrics, isLoading } = useQuery({
    queryKey: ['host-financial-metrics', authState.user?.id],
    queryFn: () => getHostFinancialMetrics(authState.user?.id || ''),
    enabled: !!authState.user?.id,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
  });

  // Use real data if available, otherwise fall back to props
  const monthlyData = financialMetrics?.monthlyData || [];
  const revenueByCategory = financialMetrics?.revenueByCategory || [];
  const actualTotalRevenue = financialMetrics?.totalRevenue || totalRevenue;
  const actualMonthlyRevenue = financialMetrics?.monthlyRevenue || monthlyRevenue;
  const actualRevenueGrowth = financialMetrics?.revenueGrowth || revenueGrowth;
  const actualAverageBookingValue = financialMetrics?.averageBookingValue || averageBookingValue;
  const actualOccupancyRate = financialMetrics?.occupancyRate || occupancyRate;

  return (
    <div className="space-y-6">
      <FinancialMetricsCards
        totalRevenue={actualTotalRevenue}
        monthlyRevenue={actualMonthlyRevenue}
        revenueGrowth={actualRevenueGrowth}
        averageBookingValue={actualAverageBookingValue}
        occupancyRate={actualOccupancyRate}
      />

      <FinancialMetricsCharts
        monthlyData={monthlyData}
        revenueByCategory={revenueByCategory}
      />

      {/* AI Insights disabled due to feature deprecation
      <FinancialMetricsInsights
        revenueGrowth={actualRevenueGrowth}
        occupancyRate={actualOccupancyRate}
      />
      */}
    </div>
  );
};
