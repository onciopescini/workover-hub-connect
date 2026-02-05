import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { HostAnalyticsChartProps } from '@/types/host-analytics';

export const MonthlyRevenueBarChart: React.FC<HostAnalyticsChartProps> = ({ 
  data, 
  isLoading 
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5" />
            Revenue Mensile
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
            <BarChart3 className="h-5 w-5" />
            Revenue Mensile
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

  // Find max revenue to highlight
  const maxRevenue = Math.max(...data.map(d => d.total_revenue));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-primary" />
          Revenue Mensile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="revenueGradientHighlight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(142 76% 36%)" stopOpacity={0.7} />
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
                tickFormatter={(value) => `€${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0 && payload[0]?.payload) {
                    const item = payload[0].payload as { 
                      month_year: string; 
                      total_revenue: number; 
                      booking_count: number;
                    };
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-lg">
                        <p className="font-medium text-sm mb-2">{item.month_year}</p>
                        <div className="space-y-1 text-sm">
                          <p className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Revenue:</span>
                            <span className="font-semibold text-primary">
                              €{item.total_revenue.toFixed(2)}
                            </span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Prenotazioni:</span>
                            <span className="font-medium">{item.booking_count}</span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="total_revenue" 
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              >
                {data.map((entry, index) => {
                  const isMax = entry.total_revenue === maxRevenue;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isMax 
                        ? 'url(#revenueGradientHighlight)' 
                        : 'url(#revenueGradient)'
                      }
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
