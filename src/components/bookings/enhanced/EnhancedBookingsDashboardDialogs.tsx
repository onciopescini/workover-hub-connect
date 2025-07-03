import React from 'react';
import { MessageDialog } from '@/components/messaging/MessageDialog';
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
  messageDialogOpen,
  setMessageDialogOpen,
  messageBookingId,
  messageSpaceTitle,
  cancelDialogOpen,
  setCancelDialogOpen,
  selectedBooking,
  onCancelBooking,
  cancelBookingLoading
}: EnhancedBookingsDashboardDialogsProps) {
  return (
    <>
      <MessageDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        bookingId={messageBookingId}
        bookingTitle={messageSpaceTitle}
      />

      <CancelBookingDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        booking={selectedBooking}
        onConfirm={onCancelBooking}
        isLoading={cancelBookingLoading}
      />
    </>
  );
}