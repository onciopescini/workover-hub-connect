
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BookingWithDetails } from "@/types/booking";
import LoadingScreen from "@/components/LoadingScreen";
import { MessageDialog } from "@/components/messaging/MessageDialog";
import { CancelBookingDialog } from "@/components/bookings/CancelBookingDialog";
import { BookingCard } from "@/components/bookings/BookingCard";
import { BookingTabs } from "@/components/bookings/BookingTabs";
import { EmptyBookingsState } from "@/components/bookings/EmptyBookingsState";
import { useBookings } from "@/hooks/useBookings";
import { cancelBooking } from "@/lib/booking-utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function Bookings() {
  const { authState } = useAuth();
  const { bookings, setBookings, isLoading, error, refetch } = useBookings();
  const [filteredBookings, setFilteredBookings] = useState<BookingWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [selectedBookingTitle, setSelectedBookingTitle] = useState<string>("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<BookingWithDetails | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Filter bookings based on active tab
  useEffect(() => {
    if (activeTab === "all") {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter(booking => booking.status === activeTab));
    }
  }, [activeTab, bookings]);

  // Determine if current user is host or coworker for each booking
  const getUserRole = (booking: BookingWithDetails) => {
    return authState.user?.id === booking.space?.host_id ? "host" : "coworker";
  };

  // Open message dialog
  const openMessageDialog = (bookingId: string, spaceTitle: string) => {
    setSelectedBookingId(bookingId);
    setSelectedBookingTitle(spaceTitle);
    setMessageDialogOpen(true);
  };

  // Open cancel dialog
  const openCancelDialog = (booking: BookingWithDetails) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  // Handle booking cancellation
  const handleCancelBooking = async (reason?: string) => {
    if (!bookingToCancel) return;

    setIsCancelling(true);
    try {
      const userRole = getUserRole(bookingToCancel);
      const result = await cancelBooking(
        bookingToCancel.id, 
        userRole === "host", 
        reason
      );

      if (result.success) {
        // Update the booking in the local state
        setBookings(prev => prev.map(booking => 
          booking.id === bookingToCancel.id 
            ? { ...booking, status: 'cancelled' as const }
            : booking
        ));
        setCancelDialogOpen(false);
        setBookingToCancel(null);
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error("Errore nella cancellazione della prenotazione");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRetry = () => {
    refetch();
  };

  if (authState.isLoading) {
    return <LoadingScreen />;
  }

  // Show error state with retry option
  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Errore nel caricamento
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={handleRetry} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Riprova
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Le tue Prenotazioni
            </h1>
            <p className="text-gray-600 mt-1">
              Gestisci le tue prenotazioni come {authState.profile?.role === "host" ? "host e coworker" : "coworker"}
            </p>
          </div>
          
          {/* Refresh button */}
          <Button
            variant="outline"
            onClick={handleRetry}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>

        {/* Tabs for filtering */}
        <BookingTabs 
          bookings={bookings}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          {filteredBookings.length === 0 ? (
            <EmptyBookingsState activeTab={activeTab} />
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => {
                const userRole = getUserRole(booking);
                return (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    userRole={userRole}
                    onOpenMessageDialog={openMessageDialog}
                    onOpenCancelDialog={openCancelDialog}
                  />
                );
              })}
            </div>
          )}
        </BookingTabs>

        {/* Message Dialog */}
        <MessageDialog
          open={messageDialogOpen}
          onOpenChange={setMessageDialogOpen}
          bookingId={selectedBookingId}
          bookingTitle={selectedBookingTitle}
        />

        {/* Cancel Booking Dialog */}
        {bookingToCancel && (
          <CancelBookingDialog
            open={cancelDialogOpen}
            onOpenChange={setCancelDialogOpen}
            booking={bookingToCancel}
            onConfirm={handleCancelBooking}
            isLoading={isCancelling}
          />
        )}
      </div>
    </div>
  );
}
