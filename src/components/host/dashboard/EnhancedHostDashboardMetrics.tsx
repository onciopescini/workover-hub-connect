
import React from 'react';
import { Euro, TrendingUp, Calendar, Users } from "lucide-react";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { HostDashboardMetrics } from '@/hooks/queries/useEnhancedHostDashboard';

interface EnhancedHostDashboardMetricsProps {
  metrics: HostDashboardMetrics;
}

export const EnhancedHostDashboardMetrics: React.FC<EnhancedHostDashboardMetricsProps> = ({
  metrics
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricsCard
        title="Fatturato Totale"
        value={metrics.totalRevenue}
        icon={<Euro className="w-5 h-5" />}
        variant="revenue"
        description="Guadagni totali confermati"
      />
      
      <MetricsCard
        title="Fatturato Mensile"
        value={metrics.monthlyRevenue}
        change={metrics.revenueGrowth}
        changeLabel="vs mese scorso"
        icon={<TrendingUp className="w-5 h-5" />}
        variant="revenue"
      />
      
      <MetricsCard
        title="Prenotazioni"
        value={`${metrics.confirmedBookings}/${metrics.totalBookings}`}
        icon={<Calendar className="w-5 h-5" />}
        variant="bookings"
        description={`${metrics.pendingBookings} in attesa`}
      />
      
      <MetricsCard
        title="Tasso Occupazione"
        value={`${metrics.occupancyRate.toFixed(1)}%`}
        icon={<Users className="w-5 h-5" />}
        variant="rate"
        description="Media mensile"
      />
    </div>
  );
};
