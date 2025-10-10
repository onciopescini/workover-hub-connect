import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICards } from "./KPICards";
import { UserAnalyticsChart } from "./UserAnalyticsChart";
import { BookingAnalyticsChart } from "./BookingAnalyticsChart";
import { RevenueAnalyticsChart } from "./RevenueAnalyticsChart";
import { HostPerformanceTable } from "./HostPerformanceTable";
import { RealTimeMonitor } from "./RealTimeMonitor";
import { ExportReportsModal } from "./ExportReportsModal";
import { Button } from "@/components/ui/button";
import { Download, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [exportModalOpen, setExportModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Ultimi 7 giorni</SelectItem>
              <SelectItem value="30d">Ultimi 30 giorni</SelectItem>
              <SelectItem value="90d">Ultimi 90 giorni</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setExportModalOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          Esporta Report
        </Button>
      </div>

      {/* KPIs */}
      <KPICards timeRange={timeRange} />

      {/* Real-time Monitor */}
      <RealTimeMonitor />

      {/* Analytics Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Utenti</TabsTrigger>
          <TabsTrigger value="bookings">Prenotazioni</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="hosts">Performance Host</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <UserAnalyticsChart timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          <BookingAnalyticsChart timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <RevenueAnalyticsChart timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="hosts" className="space-y-6">
          <HostPerformanceTable timeRange={timeRange} />
        </TabsContent>
      </Tabs>

      {/* Export Modal */}
      <ExportReportsModal 
        open={exportModalOpen} 
        onOpenChange={setExportModalOpen}
        timeRange={timeRange}
      />
    </div>
  );
}
