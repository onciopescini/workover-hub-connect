
import React from 'react';
import { FinancialMetricsCards } from './components/FinancialMetricsCards';
import { FinancialMetricsCharts } from './components/FinancialMetricsCharts';
import { FinancialMetricsInsights } from './components/FinancialMetricsInsights';
import { FinancialMetricsProps } from './types/financial-metrics-types';
import { getMonthlyData, getRevenueByCategory } from './utils/financial-metrics-data';

export const AdvancedFinancialMetrics: React.FC<FinancialMetricsProps> = ({
  totalRevenue,
  monthlyRevenue,
  revenueGrowth,
  averageBookingValue,
  occupancyRate
}) => {
  const monthlyData = getMonthlyData(monthlyRevenue);
  const revenueByCategory = getRevenueByCategory();

  return (
    <div className="space-y-6">
      <FinancialMetricsCards
        totalRevenue={totalRevenue}
        monthlyRevenue={monthlyRevenue}
        revenueGrowth={revenueGrowth}
        averageBookingValue={averageBookingValue}
        occupancyRate={occupancyRate}
      />

      <FinancialMetricsCharts
        monthlyData={monthlyData}
        revenueByCategory={revenueByCategory}
      />

      <FinancialMetricsInsights
        revenueGrowth={revenueGrowth}
        occupancyRate={occupancyRate}
      />
    </div>
  );
};
