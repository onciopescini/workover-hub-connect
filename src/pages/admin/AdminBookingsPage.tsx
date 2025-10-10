import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingsList } from "@/components/admin/bookings/BookingsList";
import { PaymentMonitoringPanel } from "@/components/admin/bookings/PaymentMonitoringPanel";
import { DisputeManagementPanel } from "@/components/admin/bookings/DisputeManagementPanel";
import { FinancialReportsWidget } from "@/components/admin/bookings/FinancialReportsWidget";
import { Calendar, CreditCard, AlertTriangle, TrendingUp } from "lucide-react";

export default function AdminBookingsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Booking & Payment Oversight</h1>
        <p className="text-muted-foreground mt-2">
          Gestisci prenotazioni, pagamenti, dispute e rimborsi
        </p>
      </div>

      <FinancialReportsWidget />

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Prenotazioni
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagamenti
          </TabsTrigger>
          <TabsTrigger value="disputes" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Dispute
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <BookingsList />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentMonitoringPanel />
        </TabsContent>

        <TabsContent value="disputes">
          <DisputeManagementPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
