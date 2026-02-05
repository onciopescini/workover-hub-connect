import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { HostAnalyticsChartProps } from '@/types/host-analytics';

export const BookingTrendLineChart: React.FC<HostAnalyticsChartProps> = ({ 
  data, 
  isLoading 
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Trend Prenotazioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Trend Prenotazioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            Nessun dato disponibile per il periodo selezionato
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate average for reference line
  const avgBookings = data.reduce((sum, d) => sum + d.booking_count, 0) / data.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trend Prenotazioni
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Media: <span className="font-medium">{avgBookings.toFixed(1)}</span>/mese
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="stroke-muted" 
                vertical={false}
              />
              <XAxis
                dataKey="month_label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0 && payload[0]?.payload) {
                    const item = payload[0].payload as {
                      month_year: string;
                      booking_count: number;
                      avg_booking_value: number;
                    };
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-lg">
                        <p className="font-medium text-sm mb-2">{item.month_year}</p>
                        <div className="space-y-1 text-sm">
                          <p className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Prenotazioni:</span>
                            <span className="font-semibold text-primary">
                              {item.booking_count}
                            </span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Valore Medio:</span>
                            <span className="font-medium">
                              €{item.avg_booking_value.toFixed(2)}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="booking_count"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#bookingGradient)"
                dot={{
                  fill: 'hsl(var(--primary))',
                  strokeWidth: 2,
                  stroke: 'hsl(var(--background))',
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                  stroke: 'hsl(var(--primary))',
                  strokeWidth: 2,
                  fill: 'hsl(var(--background))',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
