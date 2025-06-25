import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, AlertTriangle } from 'lucide-react';
import { EnhancedBookingCard } from '../EnhancedBookingCard';
import { MessageDialog } from '../../messaging/MessageDialog';
import { CancelBookingDialog } from '../CancelBookingDialog';
import { BookingWithDetails } from '@/types/booking';

interface BookingsDashboardContentProps {
  isLoading: boolean;
  bookings: BookingWithDetails[];
  searchTerm: string;
  getUserRole: (booking: BookingWithDetails) => "host" | "coworker";
  isChatEnabled: (booking: BookingWithDetails) => boolean;
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
  messageDialogOpen: boolean;
  setMessageDialogOpen: (open: boolean) => void;
  messageBookingId: string;
  messageSpaceTitle: string;
  cancelDialogOpen: boolean;
  setCancelDialogOpen: (open: boolean) => void;
  selectedBooking: BookingWithDetails | null;
  onCancelBooking: (reason?: string) => Promise<void>;
  cancelBookingLoading: boolean;
}

export const BookingsDashboardContent = ({
  isLoading,
  bookings,
  searchTerm,
  getUserRole,
  isChatEnabled,
  onOpenMessageDialog,
  onOpenCancelDialog,
  messageDialogOpen,
  setMessageDialogOpen,
  messageBookingId,
  messageSpaceTitle,
  cancelDialogOpen,
  setCancelDialogOpen,
  selectedBooking,
  onCancelBooking,
  cancelBookingLoading
}: BookingsDashboardContentProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm ? 'Nessun risultato' : 'Nessuna prenotazione'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm 
              ? 'Non sono state trovate prenotazioni con i filtri applicati.'
              : 'Non hai ancora ricevuto prenotazioni. Inizia pubblicando uno spazio!'
            }
          </p>
          {!searchTerm && (
            <Button onClick={() => window.location.href = '/space/new'}>
              Pubblica il tuo primo spazio
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {bookings.map((booking) => (
          <EnhancedBookingCard
            key={booking.id}
            booking={booking}
            userRole={getUserRole(booking)}
            onOpenMessageDialog={onOpenMessageDialog}
            onOpenCancelDialog={onOpenCancelDialog}
            isChatEnabled={isChatEnabled(booking)}
          />
        ))}
      </div>

      {/* Dialogs */}
      <MessageDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        bookingId={messageBookingId}
        bookingTitle={messageSpaceTitle}
      />

      {selectedBooking && (
        <CancelBookingDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          booking={selectedBooking}
          onConfirm={onCancelBooking}
          isLoading={cancelBookingLoading}
        />
      )}
    </>
  );
};
