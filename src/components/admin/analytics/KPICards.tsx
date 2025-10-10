import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAnalytics } from "@/hooks/admin/useAdminAnalytics";
import { Users, Calendar, Euro, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface KPICardsProps {
  timeRange: "7d" | "30d" | "90d";
}

export function KPICards({ timeRange }: KPICardsProps) {
  const { kpis, isLoading } = useAdminAnalytics(timeRange);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpiData = [
    {
      title: "Utenti Attivi",
      value: kpis?.activeUsers || 0,
      change: kpis?.activeUsersChange || 0,
      icon: Users,
    },
    {
      title: "Prenotazioni",
      value: kpis?.totalBookings || 0,
      change: kpis?.bookingsChange || 0,
      icon: Calendar,
    },
    {
      title: "Revenue Totale",
      value: `€${(kpis?.totalRevenue || 0).toFixed(2)}`,
      change: kpis?.revenueChange || 0,
      icon: Euro,
    },
    {
      title: "Conversion Rate",
      value: `${(kpis?.conversionRate || 0).toFixed(1)}%`,
      change: kpis?.conversionChange || 0,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpiData.map((kpi) => {
        const Icon = kpi.icon;
        const isPositive = kpi.change >= 0;
        
        return (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {kpi.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {isPositive ? (
                  <ArrowUp className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-red-500" />
                )}
                <span className={isPositive ? "text-green-500" : "text-red-500"}>
                  {Math.abs(kpi.change).toFixed(1)}%
                </span>
                <span>vs periodo precedente</span>
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
