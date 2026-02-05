import React from 'react';
import { useHostMonthlyRevenue } from '@/hooks/queries/useHostMonthlyRevenue';
import { AnalyticsKPICards } from './AnalyticsKPICards';
import { MonthlyRevenueBarChart } from './MonthlyRevenueBarChart';
import { BookingTrendLineChart } from './BookingTrendLineChart';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HostAnalyticsDashboardProps } from '@/types/host-analytics';

export const HostAnalyticsDashboard: React.FC<HostAnalyticsDashboardProps> = ({
  hostId,
  monthsBack = 12,
}) => {
  const { data, kpis, isLoading, error, refetch } = useHostMonthlyRevenue({
    hostId,
    monthsBack,
    enabled: !!hostId,
  });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Errore nel caricamento dei dati analytics: {error.message}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="ml-4"
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            Riprova
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <AnalyticsKPICards kpis={kpis} isLoading={isLoading} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyRevenueBarChart data={data} isLoading={isLoading} />
        <BookingTrendLineChart data={data} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default HostAnalyticsDashboard;
