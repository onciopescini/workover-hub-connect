import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart } from "lucide-react";
import { AdvancedRevenueAnalytics } from '@/components/host/revenue/AdvancedRevenueAnalytics';
import { TabContentProps } from '../types/dashboard-tabs-types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { HostAnalyticsDashboard } from '@/components/host/analytics/HostAnalyticsDashboard';
import { useAuth } from '@/hooks/auth/useAuth';

export const RevenueTabContent: React.FC<Pick<TabContentProps, 'metrics' | 'recentActivity'>> = ({
  metrics,
  recentActivity
}) => {
  const { authState } = useAuth();
  const hostId = authState.user?.id || '';

  const formatDate = (date: Date): string => {
    return format(date, 'dd MMMM yyyy', { locale: it });
  };

  return (
    <TabsContent value="revenue" className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Revenue & Finanze</h2>
          <p className="text-muted-foreground">Analisi completa di ricavi e finanze basata sui dati reali</p>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          {metrics.totalBookings} prenotazioni totali
        </Badge>
      </div>

      {/* Real-Data Analytics Dashboard */}
      {hostId && <HostAnalyticsDashboard hostId={hostId} monthsBack={12} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Metriche Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Prenotazioni Confermate</span>
              <Badge className="bg-green-100 text-green-800">
                {metrics.confirmedBookings}/{metrics.totalBookings}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Prenotazioni in Attesa</span>
              <Badge className="bg-yellow-100 text-yellow-800">
                {metrics.pendingBookings}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Tasso di Occupazione</span>
              <span className="font-semibold">{metrics.occupancyRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Valore Medio Prenotazione</span>
              <span className="font-semibold">€{metrics.averageBookingValue.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spazio Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topPerformingSpace ? (
              <div className="space-y-2">
                <h3 className="font-semibold">{metrics.topPerformingSpace.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Revenue Generato</span>
                  <span className="font-semibold text-green-600">
                    €{metrics.topPerformingSpace.revenue?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <Badge variant="secondary">Miglior Performance</Badge>
              </div>
            ) : (
              <p className="text-muted-foreground">Nessun dato disponibile</p>
            )}
          </CardContent>
        </Card>
      </div>

      {recentActivity && recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attività Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div>
                    <p className="text-sm font-medium">{activity.type}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      €{metrics.averageBookingValue.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(new Date(activity.created_at))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Metrics Section */}
      <div className="mt-8">
        <div className="flex items-center mb-6">
          <PieChart className="w-5 h-5 mr-2" />
          <h3 className="text-xl font-semibold">Metriche Finanziarie Avanzate</h3>
        </div>
        <AdvancedRevenueAnalytics
          totalRevenue={metrics.totalRevenue}
          monthlyRevenue={metrics.monthlyRevenue}
          revenueGrowth={metrics.revenueGrowth}
        />
      </div>
    </TabsContent>
  );
};
