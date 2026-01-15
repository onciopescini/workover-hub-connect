import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAdminAnalytics } from "@/hooks/admin/useAdminAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, TrendingUp } from "lucide-react";

interface HostPerformanceTableProps {
  timeRange: "7d" | "30d" | "90d";
}

export function HostPerformanceTable({ timeRange }: HostPerformanceTableProps) {
  const { hostPerformance, isLoading } = useAdminAnalytics(timeRange);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Top Host Performance</CardTitle>
          <CardDescription>
            Host con migliori performance nel periodo selezionato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Prenotazioni</TableHead>
                  <TableHead className="text-right">Response Time</TableHead>
                  <TableHead className="text-right">Accept Rate</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hostPerformance?.map((host, index) => (
                  <TableRow key={host.hostId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {index < 3 && (
                          <TrendingUp className="h-4 w-4 text-primary" />
                        )}
                        <span className="font-medium">#{index + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{host.hostName}</p>
                        <p className="text-sm text-muted-foreground">
                          {host.spacesCount} spazi
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      €{host.totalRevenue.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {host.totalBookings}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={host.avgResponseTime < 60 ? "default" : "secondary"}>
                        {host.avgResponseTime}m
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={host.acceptanceRate > 80 ? "default" : "secondary"}>
                        {host.acceptanceRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{host.avgRating.toFixed(1)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Best Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {hostPerformance
                ?.slice()
                .sort((a, b) => a.avgResponseTime - b.avgResponseTime)
                .slice(0, 3)
                .map((host, index) => (
                  <div key={host.hostId} className="flex items-center justify-between">
                    <span className="text-sm">
                      #{index + 1} {host.hostName}
                    </span>
                    <Badge variant="secondary">{host.avgResponseTime}m</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Highest Accept Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {hostPerformance
                ?.slice()
                .sort((a, b) => b.acceptanceRate - a.acceptanceRate)
                .slice(0, 3)
                .map((host, index) => (
                  <div key={host.hostId} className="flex items-center justify-between">
                    <span className="text-sm">
                      #{index + 1} {host.hostName}
                    </span>
                    <Badge variant="secondary">{host.acceptanceRate}%</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Rated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {hostPerformance
                ?.slice()
                .sort((a, b) => b.avgRating - a.avgRating)
                .slice(0, 3)
                .map((host, index) => (
                  <div key={host.hostId} className="flex items-center justify-between">
                    <span className="text-sm">
                      #{index + 1} {host.hostName}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{host.avgRating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
