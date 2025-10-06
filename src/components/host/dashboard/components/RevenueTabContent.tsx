import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Euro, TrendingUp, Calendar, Users, PieChart, BarChart3 } from "lucide-react";
import { AdvancedFinancialMetrics } from '@/components/dashboard/AdvancedFinancialMetrics';
import { TabContentProps } from '../types/dashboard-tabs-types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { RevenueChart } from './RevenueChart';

export const RevenueTabContent: React.FC<Pick<TabContentProps, 'metrics' | 'recentActivity'>> = ({
  metrics,
  recentActivity
}) => {
  const formatDate = (date: Date): string => {
    return format(date, 'dd MMMM yyyy', { locale: it });
  };

  // Calcola dati revenue reali dalle metriche
  const revenueData = {
    totalRevenue: metrics.totalRevenue,
    averageDailyRevenue: metrics.monthlyRevenue / 30,
    bookingsCount: metrics.totalBookings,
    spacesCount: 1, // Placeholder - da implementare conteggio spazi reali
  };

  return (
    <TabsContent value="revenue" className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Revenue & Finanze</h2>
          <p className="text-muted-foreground">Analisi completa di ricavi e finanze basata sui dati reali</p>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          {revenueData.bookingsCount} prenotazioni totali
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="rounded-full bg-green-100 p-2">
              <Euro className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">€{revenueData.totalRevenue.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Revenue Totale</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="rounded-full bg-blue-100 p-2">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">€{revenueData.averageDailyRevenue.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Media Giornaliera</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="rounded-full bg-indigo-100 p-2">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{revenueData.bookingsCount}</div>
              <div className="text-sm text-muted-foreground">Prenotazioni Totali</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="rounded-full bg-purple-100 p-2">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Crescita Mensile</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <RevenueChart monthlyRevenue={metrics.monthlyRevenue} />

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
        <AdvancedFinancialMetrics
          totalRevenue={metrics.totalRevenue}
          monthlyRevenue={metrics.monthlyRevenue}
          revenueGrowth={metrics.revenueGrowth}
          averageBookingValue={metrics.averageBookingValue}
          occupancyRate={metrics.occupancyRate}
        />
      </div>
    </TabsContent>
  );
};