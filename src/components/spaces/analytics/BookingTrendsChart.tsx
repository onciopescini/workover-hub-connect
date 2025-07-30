import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { BookingTrend } from "@/hooks/queries/useSpaceMetrics";

interface BookingTrendsChartProps {
  data: BookingTrend[];
}

export const BookingTrendsChart = ({ data }: BookingTrendsChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trend Prenotazioni</CardTitle>
          <CardDescription>Andamento prenotazioni e ricavi negli ultimi 6 mesi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Nessun dato disponibile
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    if (!year || !month) return monthStr;
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
  };

  const chartData = data.map(item => ({
    ...item,
    monthFormatted: formatMonth(item.month)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trend Prenotazioni</CardTitle>
        <CardDescription>Andamento prenotazioni e ricavi negli ultimi 6 mesi</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="monthFormatted" />
            <YAxis yAxisId="bookings" orientation="left" />
            <YAxis yAxisId="revenue" orientation="right" />
            <Tooltip 
              formatter={(value: any, name: string) => [
                name === 'bookings' ? `${value} prenotazioni` : `€${value.toFixed(2)}`,
                name === 'bookings' ? 'Prenotazioni' : 'Ricavi'
              ]}
            />
            <Line 
              yAxisId="bookings"
              type="monotone" 
              dataKey="bookings" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
            <Line 
              yAxisId="revenue"
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--secondary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--secondary))' }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {data.reduce((sum, item) => sum + item.bookings, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Prenotazioni totali</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary">
              €{data.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Ricavi totali</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};