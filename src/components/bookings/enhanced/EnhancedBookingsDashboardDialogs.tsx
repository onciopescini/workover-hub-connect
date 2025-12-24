import React from 'react';
import { CancelBookingDialog } from '../CancelBookingDialog';
import { BookingWithDetails } from '@/types/booking';

interface EnhancedBookingsDashboardDialogsProps {
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

export function EnhancedBookingsDashboardDialogs({
  cancelDialogOpen,
  setCancelDialogOpen,
  selectedBooking,
  onCancelBooking,
  cancelBookingLoading
}: EnhancedBookingsDashboardDialogsProps) {
  return (
    <>
      {/* MessageDialog removed as we now redirect to /messages */}

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
}
