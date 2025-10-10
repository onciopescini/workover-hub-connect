import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAnalytics } from "@/hooks/admin/useAdminAnalytics";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface UserAnalyticsChartProps {
  timeRange: "7d" | "30d" | "90d";
}

export function UserAnalyticsChart({ timeRange }: UserAnalyticsChartProps) {
  const { userGrowth, isLoading } = useAdminAnalytics(timeRange);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Crescita Utenti</CardTitle>
          <CardDescription>
            Registrazioni e utenti attivi nel periodo selezionato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="signups" 
                stroke="hsl(var(--primary))" 
                name="Nuove Registrazioni"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="activeUsers" 
                stroke="hsl(var(--chart-2))" 
                name="Utenti Attivi"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuzione per Ruolo</CardTitle>
            <CardDescription>Host vs Coworker</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Host</span>
                  <span className="text-sm text-muted-foreground">
                    {userGrowth?.[userGrowth.length - 1]?.hosts || 0}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary"
                    style={{ 
                      width: `${((userGrowth?.[userGrowth.length - 1]?.hosts || 0) / 
                        (userGrowth?.[userGrowth.length - 1]?.signups || 1) * 100)}%` 
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Coworker</span>
                  <span className="text-sm text-muted-foreground">
                    {userGrowth?.[userGrowth.length - 1]?.coworkers || 0}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-chart-2"
                    style={{ 
                      width: `${((userGrowth?.[userGrowth.length - 1]?.coworkers || 0) / 
                        (userGrowth?.[userGrowth.length - 1]?.signups || 1) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement Metrics</CardTitle>
            <CardDescription>Metriche di coinvolgimento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">DAU/MAU Ratio</span>
                <span className="text-2xl font-bold">
                  {((userGrowth?.[userGrowth.length - 1]?.activeUsers || 0) / 
                    (userGrowth?.[userGrowth.length - 1]?.signups || 1) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Retention Rate</span>
                <span className="text-2xl font-bold">
                  {userGrowth?.[userGrowth.length - 1]?.retentionRate || 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
