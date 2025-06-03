
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingWithDetails } from "@/types/booking";
import { BookingApprovalCard } from "./BookingApprovalCard";

interface PendingBookingsProps {
  bookings: BookingWithDetails[];
  onApprovalUpdate: () => void;
}

export function PendingBookings({ bookings, onApprovalUpdate }: PendingBookingsProps) {
  const pendingBookings = bookings.filter(booking => booking.status === 'pending');

  if (pendingBookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prenotazioni da Approvare</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            Nessuna prenotazione in attesa di approvazione
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Prenotazioni da Approvare
          <span className="bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded-full">
            {pendingBookings.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingBookings.map((booking) => (
          <BookingApprovalCard
            key={booking.id}
            booking={booking}
            onApprovalUpdate={onApprovalUpdate}
          />
        ))}
      </CardContent>
    </Card>
  );
}
