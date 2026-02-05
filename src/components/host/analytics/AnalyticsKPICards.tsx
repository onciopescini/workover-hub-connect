import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Euro, CalendarCheck, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { HostAnalyticsKPIs } from '@/types/host-analytics';
import { formatCurrency } from '@/lib/format';

interface AnalyticsKPICardsProps {
  kpis: HostAnalyticsKPIs;
  isLoading: boolean;
}

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  iconBg: string;
  isLoading: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  iconBg,
  isLoading 
}) => {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            )}
          </div>
          <div className={`rounded-full p-2.5 ${iconBg}`}>
            {icon}
          </div>
        </div>
        
        {change !== undefined && !isLoading && (
          <div className="mt-3 flex items-center gap-1 text-sm">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
              {isPositive ? '+' : ''}{change.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs mese prec.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const AnalyticsKPICards: React.FC<AnalyticsKPICardsProps> = ({ kpis, isLoading }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Revenue Totale"
        value={formatCurrency(kpis.totalRevenue)}
        change={kpis.revenueChange}
        icon={<Euro className="h-5 w-5 text-green-600" />}
        iconBg="bg-green-100"
        isLoading={isLoading}
      />
      
      <KPICard
        title="Prenotazioni"
        value={kpis.totalBookings.toString()}
        change={kpis.bookingsChange}
        icon={<CalendarCheck className="h-5 w-5 text-blue-600" />}
        iconBg="bg-blue-100"
        isLoading={isLoading}
      />
      
      <KPICard
        title="Valore Medio"
        value={formatCurrency(kpis.avgBookingValue)}
        icon={<TrendingUp className="h-5 w-5 text-indigo-600" />}
        iconBg="bg-indigo-100"
        isLoading={isLoading}
      />
      
      <KPICard
        title="Fee Piattaforma"
        value={formatCurrency(kpis.totalPlatformFees)}
        icon={<Wallet className="h-5 w-5 text-amber-600" />}
        iconBg="bg-amber-100"
        isLoading={isLoading}
      />
    </div>
  );
};
