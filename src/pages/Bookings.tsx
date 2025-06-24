import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, MessageSquare, User } from "lucide-react";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useBookingsQuery, useCancelBookingMutation } from "@/hooks/queries/useBookingsQuery";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const Bookings = () => {
  const { authState } = useAuth();
  const { data: bookings, isLoading, error } = useBookingsQuery();
  const { mutate: cancelBooking, isLoading: isCancelling } = useCancelBookingMutation();
  const [cancelReason, setCancelReason] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isCancellationDialogOpen, setIsCancellationDialogOpen] = useState(false);

  const handleOpenCancellationDialog = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsCancellationDialogOpen(true);
  };

  const handleCloseCancellationDialog = () => {
    setIsCancellationDialogOpen(false);
    setSelectedBookingId(null);
    setCancelReason('');
  };

  const handleCancelBooking = () => {
    if (!selectedBookingId) return;

    cancelBooking({
      bookingId: selectedBookingId,
      isHost: false,
      reason: cancelReason,
    });

    handleCloseCancellationDialog();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Errore nel caricamento</h2>
          <p className="text-gray-600">Si è verificato un errore durante il caricamento delle prenotazioni.</p>
        </div>
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Nessuna prenotazione</h2>
          <p className="text-gray-600">Non hai ancora effettuato nessuna prenotazione.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Le mie Prenotazioni</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <CardTitle>
                {booking.space?.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{format(new Date(booking.booking_date), 'PPP', { locale: it })}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{booking.start_time} - {booking.end_time}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{booking.space?.address}</span>
              </div>
              {booking.coworker && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>Prenotazione di: {booking.coworker.first_name} {booking.coworker.last_name}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{booking.status}</Badge>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenCancellationDialog(booking.id)}
                  disabled={isCancelling}
                >
                  Cancella
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cancellation Dialog */}
      <Dialog open={isCancellationDialogOpen} onOpenChange={setIsCancellationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conferma Cancellazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler cancellare questa prenotazione?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Textarea
                id="reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="col-span-4"
                placeholder="Motivo della cancellazione"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Annulla
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={isCancelling}
            >
              Conferma Cancellazione
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Bookings;
