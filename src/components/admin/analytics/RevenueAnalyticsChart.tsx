import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAnalytics } from "@/hooks/admin/useAdminAnalytics";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface RevenueAnalyticsChartProps {
  timeRange: "7d" | "30d" | "90d";
}

export function RevenueAnalyticsChart({ timeRange }: RevenueAnalyticsChartProps) {
  const { revenueTrends, revenueBreakdown, isLoading } = useAdminAnalytics(timeRange);

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>
            Revenue totale e breakdown componenti
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTrends || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `€${value.toFixed(2)}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="totalRevenue" 
                stroke="hsl(var(--primary))" 
                name="Revenue Totale"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="platformFees" 
                stroke="hsl(var(--chart-2))" 
                name="Platform Fees"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="hostPayouts" 
                stroke="hsl(var(--chart-3))" 
                name="Host Payouts"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>Distribuzione revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Host Payouts</span>
                  <span className="text-sm text-muted-foreground">
                    €{revenueBreakdown?.hostPayouts?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary"
                    style={{ 
                      width: `${((revenueBreakdown?.hostPayouts || 0) / 
                        (revenueBreakdown?.totalRevenue || 1) * 100)}%` 
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Platform Fees</span>
                  <span className="text-sm text-muted-foreground">
                    €{revenueBreakdown?.platformFees?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-chart-2"
                    style={{ 
                      width: `${((revenueBreakdown?.platformFees || 0) / 
                        (revenueBreakdown?.totalRevenue || 1) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metriche Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Booking Value</span>
                <span className="text-2xl font-bold">
                  €{revenueBreakdown?.avgBookingValue?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Revenue per User</span>
                <span className="text-2xl font-bold">
                  €{revenueBreakdown?.revenuePerUser?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Revenue per Host</span>
                <span className="text-2xl font-bold">
                  €{revenueBreakdown?.revenuePerHost?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Distribuzione metodi di pagamento</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueBreakdown?.paymentMethods || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="method" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" name="Transazioni" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
