import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PeakHour } from "@/hooks/queries/useSpaceMetrics";

interface PeakHoursChartProps {
  data: PeakHour[];
}

export const PeakHoursChart = ({ data }: PeakHoursChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orari di Picco</CardTitle>
          <CardDescription>Distribuzione delle prenotazioni per fascia oraria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Nessun dato disponibile
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const chartData = data.map(item => ({
    ...item,
    hourFormatted: formatHour(item.hour),
    hourLabel: `${item.hour}:00-${item.hour + 1}:00`
  }));

  const maxBookings = Math.max(...data.map(item => item.bookings));
  const peakHour = data.find(item => item.bookings === maxBookings);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orari di Picco</CardTitle>
        <CardDescription>Distribuzione delle prenotazioni per fascia oraria</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="hourFormatted"
              fontSize={12}
            />
            <YAxis />
            <Tooltip 
              formatter={(value: any) => [`${value} prenotazioni`, 'Prenotazioni']}
              labelFormatter={(label) => `Fascia ${label}`}
            />
            <Bar 
              dataKey="bookings" 
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {peakHour && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold">Orario di Maggiore Richiesta</div>
              <div className="text-2xl font-bold text-primary mt-1">
                {formatHour(peakHour.hour)} - {formatHour(peakHour.hour + 1)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {peakHour.bookings} prenotazioni in questa fascia oraria
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium">Mattina (8-12)</div>
            <div className="text-muted-foreground">
              {data.filter(h => h.hour >= 8 && h.hour < 12).reduce((sum, h) => sum + h.bookings, 0)} prenotazioni
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium">Pomeriggio (12-17)</div>
            <div className="text-muted-foreground">
              {data.filter(h => h.hour >= 12 && h.hour < 17).reduce((sum, h) => sum + h.bookings, 0)} prenotazioni
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium">Sera (17-21)</div>
            <div className="text-muted-foreground">
              {data.filter(h => h.hour >= 17 && h.hour <= 20).reduce((sum, h) => sum + h.bookings, 0)} prenotazioni
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};