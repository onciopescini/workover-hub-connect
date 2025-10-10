import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAnalytics } from "@/hooks/admin/useAdminAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface BookingAnalyticsChartProps {
  timeRange: "7d" | "30d" | "90d";
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function BookingAnalyticsChart({ timeRange }: BookingAnalyticsChartProps) {
  const { bookingTrends, bookingsByCity, bookingsByCategory, isLoading } = useAdminAnalytics(timeRange);

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
          <CardTitle>Trend Prenotazioni</CardTitle>
          <CardDescription>
            Prenotazioni confermate vs cancellate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bookingTrends || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="confirmed" fill="hsl(var(--primary))" name="Confermate" />
              <Bar dataKey="cancelled" fill="hsl(var(--destructive))" name="Cancellate" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Prenotazioni per Città</CardTitle>
            <CardDescription>Top 5 città per volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={bookingsByCity || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {bookingsByCity?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prenotazioni per Categoria</CardTitle>
            <CardDescription>Breakdown per tipo spazio</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bookingsByCategory || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metriche Chiave</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Cancellation Rate</p>
              <p className="text-2xl font-bold">
                {bookingTrends && bookingTrends.length > 0
                  ? ((bookingTrends.reduce((acc, d) => acc + d.cancelled, 0) /
                      (bookingTrends.reduce((acc, d) => acc + d.confirmed + d.cancelled, 0) || 1)) *
                      100).toFixed(1)
                  : 0}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lead Time Medio</p>
              <p className="text-2xl font-bold">
                {bookingTrends?.[0]?.avgLeadTime || 0} giorni
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Occupancy Rate</p>
              <p className="text-2xl font-bold">
                {bookingTrends?.[0]?.occupancyRate || 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
