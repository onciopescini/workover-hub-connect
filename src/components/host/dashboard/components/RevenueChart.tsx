import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';

interface RevenueChartProps {
  monthlyRevenue: number;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ monthlyRevenue }) => {
  // Generate last 6 months data (placeholder - in real app would come from backend)
  const generateMonthlyData = () => {
    const data = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(currentDate, i);
      const monthName = format(date, 'MMM', { locale: it });
      
      // Simulate growth trend
      const baseRevenue = monthlyRevenue * (0.6 + (Math.random() * 0.4));
      const revenue = i === 0 ? monthlyRevenue : baseRevenue;
      
      data.push({
        month: monthName,
        revenue: Number(revenue.toFixed(2))
      });
    }
    
    return data;
  };

  const data = generateMonthlyData();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trend Revenue Ultimi 6 Mesi</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              tickFormatter={(value) => `€${value}`}
            />
            <Tooltip 
              formatter={(value: number) => [`€${value.toFixed(2)}`, 'Revenue']}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
