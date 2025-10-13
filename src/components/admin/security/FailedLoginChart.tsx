import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subHours } from 'date-fns';

export const FailedLoginChart = () => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['failed-logins-chart'],
    queryFn: async () => {
      const last24Hours = subHours(new Date(), 24);

      const { data, error } = await supabase
        .from('failed_login_attempts')
        .select('attempt_time')
        .gte('attempt_time', last24Hours.toISOString());

      if (error) throw error;

      // Group by hour
      const hourlyData = new Map<string, number>();
      for (let i = 0; i < 24; i++) {
        const hour = subHours(new Date(), 23 - i);
        const hourKey = format(hour, 'HH:00');
        hourlyData.set(hourKey, 0);
      }

      data?.forEach(attempt => {
        if (attempt.attempt_time) {
          const hourKey = format(new Date(attempt.attempt_time), 'HH:00');
          hourlyData.set(hourKey, (hourlyData.get(hourKey) || 0) + 1);
        }
      });

      return Array.from(hourlyData.entries()).map(([hour, count]) => ({
        hour,
        count
      }));
    },
    refetchInterval: 60000 // Refresh every minute
  });

  if (isLoading) {
    return <div>Loading chart...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Failed Login Attempts (Last 24 Hours)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="hsl(var(--destructive))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
