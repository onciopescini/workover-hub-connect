import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, ShoppingCart, Clock } from "lucide-react";

export function RealTimeMonitor() {
  const { data: liveStats } = useQuery({
    queryKey: ['live-stats'],
    queryFn: async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Active users in last hour
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_login_at', oneHourAgo.toISOString());

      // Bookings in last hour
      const { count: recentBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo.toISOString());

      // Payments in last hour
      const { data: recentPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', oneHourAgo.toISOString())
        .eq('payment_status', 'completed');

      const recentRevenue = recentPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Pending approval bookings
      const { count: pendingApprovals } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval');

      return {
        activeUsers: activeUsers || 0,
        recentBookings: recentBookings || 0,
        recentRevenue,
        pendingApprovals: pendingApprovals || 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const stats = [
    {
      title: "Utenti Online",
      value: liveStats?.activeUsers || 0,
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Prenotazioni (1h)",
      value: liveStats?.recentBookings || 0,
      icon: ShoppingCart,
      color: "text-green-500",
    },
    {
      title: "Revenue (1h)",
      value: `€${(liveStats?.recentRevenue || 0).toFixed(2)}`,
      icon: Activity,
      color: "text-purple-500",
    },
    {
      title: "In Attesa Approvazione",
      value: liveStats?.pendingApprovals || 0,
      icon: Clock,
      color: "text-orange-500",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Real-Time Monitor</CardTitle>
          <Badge variant="secondary" className="gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.title} className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
