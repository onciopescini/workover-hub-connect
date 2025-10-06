
import React from 'react';
import { Euro, TrendingUp, Calendar, Users } from "lucide-react";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import type { HostDashboardMetrics as HostDashboardMetricsType } from '@/hooks/queries/useEnhancedHostDashboard';

interface HostDashboardMetricsProps {
  metrics: HostDashboardMetricsType;
}

export const HostDashboardMetrics: React.FC<HostDashboardMetricsProps> = ({
  metrics
}) => {
  // Format revenue growth for display - handle edge cases
  const getRevenueGrowth = () => {
    // If no previous month data or first month, don't show change
    if (metrics.revenueGrowth === -100 && metrics.monthlyRevenue > 0) {
      return undefined; // Will hide the badge
    }
    return metrics.revenueGrowth;
  };

  // Format bookings description
  const getBookingsDescription = () => {
    const cancelled = metrics.totalBookings - metrics.confirmedBookings - metrics.pendingBookings;
    if (metrics.pendingBookings > 0 && cancelled > 0) {
      return `${metrics.pendingBookings} in attesa · ${cancelled} cancellate`;
    } else if (metrics.pendingBookings > 0) {
      return `${metrics.pendingBookings} in attesa`;
    } else if (cancelled > 0) {
      return `${cancelled} cancellate`;
    }
    return 'Tutte confermate';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricsCard
        title="Fatturato Totale"
        value={metrics.totalRevenue}
        icon={<Euro className="w-4 h-4" />}
        variant="revenue"
        description="Guadagni totali confermati"
        compact
      />
      
      <MetricsCard
        title="Fatturato Mensile"
        value={metrics.monthlyRevenue}
        change={getRevenueGrowth() ?? null}
        changeLabel={getRevenueGrowth() !== undefined ? "vs mese scorso" : null}
        icon={<TrendingUp className="w-4 h-4" />}
        variant="revenue"
        description={getRevenueGrowth() === undefined ? "Primo mese di attività" : null}
        compact
      />
      
      <MetricsCard
        title="Prenotazioni"
        value={metrics.confirmedBookings}
        icon={<Calendar className="w-4 h-4" />}
        variant="bookings"
        description={getBookingsDescription()}
        compact
      />
      
      <MetricsCard
        title="Tasso Occupazione"
        value={`${metrics.occupancyRate.toFixed(1)}%`}
        icon={<Users className="w-4 h-4" />}
        variant="rate"
        description="Media mensile"
        compact
      />
    </div>
  );
};
