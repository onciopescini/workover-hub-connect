import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SpaceMetrics } from "@/hooks/queries/useSpaceMetrics";
import { Calendar, Clock, Users, TrendingUp } from "lucide-react";

interface MetricsOverviewProps {
  metrics: SpaceMetrics;
}

export const MetricsOverview = ({ metrics }: MetricsOverviewProps) => {
  const getOccupancyStatus = (rate: number) => {
    if (rate >= 70) return { label: 'Alta', color: 'bg-green-500' };
    if (rate >= 40) return { label: 'Media', color: 'bg-yellow-500' };
    return { label: 'Bassa', color: 'bg-red-500' };
  };

  const occupancyStatus = getOccupancyStatus(metrics.occupancy_rate);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Occupancy Rate</span>
          </CardTitle>
          <CardDescription>Tasso di occupazione negli ultimi 30 giorni</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{metrics.occupancy_rate}%</div>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${occupancyStatus.color}`} />
              <span>{occupancyStatus.label}</span>
            </Badge>
          </div>
          <Progress value={metrics.occupancy_rate} className="h-2" />
          <div className="text-sm text-muted-foreground">
            {metrics.booked_days_last_30} giorni prenotati su 30
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Status Prenotazioni</span>
          </CardTitle>
          <CardDescription>Distribuzione stato prenotazioni</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confermate</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm">{metrics.confirmed_bookings}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">In Attesa</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-sm">{metrics.pending_bookings}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cancellate</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm">{metrics.cancelled_bookings}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Performance Mensile</span>
          </CardTitle>
          <CardDescription>Risultati del mese corrente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold">{metrics.monthly_bookings}</div>
              <div className="text-sm text-muted-foreground">Prenotazioni</div>
            </div>
            <div>
              <div className="text-2xl font-bold">€{metrics.monthly_revenue.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Ricavi</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Crescita Prenotazioni</span>
              <span className={`font-medium ${metrics.booking_growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {metrics.booking_growth > 0 ? '+' : ''}{metrics.booking_growth}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Crescita Ricavi</span>
              <span className={`font-medium ${metrics.revenue_growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {metrics.revenue_growth > 0 ? '+' : ''}{metrics.revenue_growth}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Statistiche Generali</span>
          </CardTitle>
          <CardDescription>Metriche complessive dello spazio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Revenue Medio per Prenotazione</span>
              <span className="font-bold">
                €{metrics.total_bookings > 0 ? (metrics.total_revenue / metrics.total_bookings).toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Prenotazioni per Mese</span>
              <span className="font-bold">
                {metrics.total_bookings > 0 ? Math.round(metrics.total_bookings / 6) : 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rating Medio</span>
              <div className="flex items-center space-x-1">
                <span className="font-bold">{metrics.average_rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({metrics.total_reviews})</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};