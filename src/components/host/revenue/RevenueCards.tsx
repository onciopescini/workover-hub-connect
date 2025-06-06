
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Calendar, TrendingUp, Users } from "lucide-react";

interface RevenueData {
  totalRevenue: number;
  totalBookings: number;
  recentPayouts: Array<{
    id: string;
    amount: number;
    date: string;
    booking_id: string;
    space_title: string;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    bookings: number;
  }>;
}

interface RevenueCardsProps {
  data: RevenueData;
}

export const RevenueCards = ({ data }: RevenueCardsProps) => {
  const averagePerBooking = data.totalBookings > 0 ? data.totalRevenue / data.totalBookings : 0;
  
  // Calculate trend (current vs previous period)
  const currentMonthRevenue = data.monthlyRevenue[data.monthlyRevenue.length - 1]?.revenue || 0;
  const previousMonthRevenue = data.monthlyRevenue[data.monthlyRevenue.length - 2]?.revenue || 0;
  const trend = previousMonthRevenue > 0 ? 
    ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ricavi Totali</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{data.totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Dopo commissioni piattaforma
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Prenotazioni</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalBookings}</div>
          <p className="text-xs text-muted-foreground">
            Prenotazioni completate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Media per Prenotazione</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{averagePerBooking.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Ricavo medio
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Trend Mensile</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            vs mese precedente
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
