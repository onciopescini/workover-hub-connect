import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpaceMetrics } from "@/hooks/queries/useSpaceMetrics";
import { ProfessionalBreakdownChart } from "./ProfessionalBreakdownChart";
import { DemographicBreakdownChart } from "./DemographicBreakdownChart";
import { BookingTrendsChart } from "./BookingTrendsChart";
import { PeakHoursChart } from "./PeakHoursChart";
import { MetricsOverview } from "./MetricsOverview";
import { ConversionMetrics } from "./ConversionMetrics";
import { TrendingUp, TrendingDown, Eye, Calendar, Star, DollarSign } from "lucide-react";

interface SpaceAnalyticsDashboardProps {
  metrics: SpaceMetrics;
}

export const SpaceAnalyticsDashboard = ({ metrics }: SpaceAnalyticsDashboardProps) => {
  return (
    <div className="space-y-6">
      {/* Header con metriche principali */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Totale</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{metrics.total_revenue.toFixed(2)}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              {metrics.revenue_growth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={metrics.revenue_growth >= 0 ? "text-green-500" : "text-red-500"}>
                {metrics.revenue_growth > 0 ? '+' : ''}{metrics.revenue_growth}% questo mese
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prenotazioni Totali</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_bookings}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              {metrics.booking_growth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={metrics.booking_growth >= 0 ? "text-green-500" : "text-red-500"}>
                {metrics.booking_growth > 0 ? '+' : ''}{metrics.booking_growth}% questo mese
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversion_rate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.total_views} visualizzazioni totali
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating Medio</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.average_rating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.total_reviews} recensioni
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs per diverse sezioni analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="conversion">Conversioni</TabsTrigger>
          <TabsTrigger value="demographics">Demografia</TabsTrigger>
          <TabsTrigger value="trends">Trend</TabsTrigger>
          <TabsTrigger value="timing">Orari</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <MetricsOverview metrics={metrics} />
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          <ConversionMetrics metrics={metrics} />
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ProfessionalBreakdownChart data={metrics.professional_breakdown} />
            <DemographicBreakdownChart data={metrics.demographic_breakdown} />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <BookingTrendsChart data={metrics.booking_trends} />
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <PeakHoursChart data={metrics.peak_hours} />
        </TabsContent>
      </Tabs>
    </div>
  );
};