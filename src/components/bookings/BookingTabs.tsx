
import { BookingWithDetails } from "@/types/booking";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BookingTabsProps {
  bookings: BookingWithDetails[];
  activeTab: "all" | "pending" | "confirmed" | "cancelled";
  onTabChange: (value: "all" | "pending" | "confirmed" | "cancelled") => void;
  children: React.ReactNode;
}

export const BookingTabs = ({ bookings, activeTab, onTabChange, children }: BookingTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="mb-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="all">Tutte ({bookings.length})</TabsTrigger>
        <TabsTrigger value="pending">
          In attesa ({bookings.filter(b => b.status === "pending").length})
        </TabsTrigger>
        <TabsTrigger value="confirmed">
          Confermate ({bookings.filter(b => b.status === "confirmed").length})
        </TabsTrigger>
        <TabsTrigger value="cancelled">
          Annullate ({bookings.filter(b => b.status === "cancelled").length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value={activeTab} className="mt-6">
        {children}
      </TabsContent>
    </Tabs>
  );
};
