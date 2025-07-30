import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DemographicBreakdown } from "@/hooks/queries/useSpaceMetrics";

interface DemographicBreakdownChartProps {
  data: DemographicBreakdown[];
}

export const DemographicBreakdownChart = ({ data }: DemographicBreakdownChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Breakdown Geografico</CardTitle>
          <CardDescription>Città di provenienza dei coworker</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Nessun dato disponibile
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Breakdown Geografico</CardTitle>
        <CardDescription>Città di provenienza dei coworker</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="city" 
              angle={-45}
              textAnchor="end"
              height={60}
              fontSize={12}
            />
            <YAxis />
            <Tooltip 
              formatter={(value: any, name: any, props: any) => [
                `${props.payload.count} prenotazioni (${props.payload.percentage}%)`,
                'Prenotazioni'
              ]}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
        
        <div className="mt-4 space-y-2">
          {data.slice(0, 5).map((item) => (
            <div key={item.city} className="flex items-center justify-between text-sm">
              <span>{item.city}</span>
              <span className="font-medium">{item.count} ({item.percentage}%)</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};