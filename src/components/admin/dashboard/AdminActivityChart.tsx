import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminActivityChartProps {
  data?: Array<{
    date: string;
    users: number;
    bookings: number;
  }>;
}

export function AdminActivityChart({ data = [] }: AdminActivityChartProps) {
  // Mock data se non forniti
  const chartData = data.length > 0 ? data : [
    { date: 'Gen', users: 120, bookings: 45 },
    { date: 'Feb', users: 150, bookings: 62 },
    { date: 'Mar', users: 180, bookings: 78 },
    { date: 'Apr', users: 220, bookings: 95 },
    { date: 'Mag', users: 280, bookings: 120 },
    { date: 'Giu', users: 310, bookings: 145 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Andamento Piattaforma</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="users" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Utenti"
            />
            <Line 
              type="monotone" 
              dataKey="bookings" 
              stroke="hsl(var(--secondary))" 
              strokeWidth={2}
              name="Prenotazioni"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
