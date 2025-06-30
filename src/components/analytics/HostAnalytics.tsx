
import React from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageSquare, Users, Star, CreditCard, FileText } from "lucide-react";
import { useHostDashboardMetrics } from "@/hooks/queries/useHostDashboardMetrics";

const HostAnalytics = () => {
  const { authState } = useAuth();
  const { data: metrics, isLoading, error } = useHostDashboardMetrics();

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!metrics) {
    return <div>No data available.</div>;
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Guadagno Totale
          </CardTitle>
          <CreditCard className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{metrics.totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-gray-500">
            Incasso totale da tutte le prenotazioni confermate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Prenotazioni Totali
          </CardTitle>
          <Calendar className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalBookings}</div>
          <p className="text-xs text-gray-500">
            {metrics.confirmedBookings} confermate, {metrics.pendingBookings} in attesa
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Tasso di Occupazione
          </CardTitle>
          <Star className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.occupancyRate.toFixed(1)}%</div>
          <p className="text-xs text-gray-500">
            Performance media dei tuoi spazi
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Valore Medio Prenotazione
          </CardTitle>
          <MessageSquare className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{metrics.averageBookingValue.toFixed(2)}</div>
          <p className="text-xs text-gray-500">
            Media del valore per prenotazione
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Crescita Mensile
          </CardTitle>
          <Users className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-500">
            Crescita revenue rispetto al mese precedente
          </p>
        </CardContent>
      </Card>

      {metrics.topPerformingSpace && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Spazio Top Performer
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{metrics.topPerformingSpace.title}</div>
            <p className="text-xs text-gray-500">
              €{metrics.topPerformingSpace.revenue?.toFixed(2) || '0.00'} generati
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HostAnalytics;
