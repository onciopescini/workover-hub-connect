import React from 'react';
import { CancelBookingDialog } from '../CancelBookingDialog';
import { RejectBookingDialog } from '../RejectBookingDialog';
import { BookingWithDetails } from '@/types/booking';

interface EnhancedBookingsDashboardDialogsProps {
  messageDialogOpen: boolean;
  setMessageDialogOpen: (open: boolean) => void;
  messageBookingId: string;
  messageSpaceTitle: string;
  cancelDialogOpen: boolean;
  setCancelDialogOpen: (open: boolean) => void;
  rejectDialogOpen: boolean;
  setRejectDialogOpen: (open: boolean) => void;
  selectedBooking: BookingWithDetails | null;
  onCancelBooking: (reason?: string) => Promise<void>;
  onRejectBooking: (reason: string) => Promise<void>;
  cancelBookingLoading: boolean;
  rejectBookingLoading: boolean;
}

export function EnhancedBookingsDashboardDialogs({
  cancelDialogOpen,
  setCancelDialogOpen,
  rejectDialogOpen,
  setRejectDialogOpen,
  selectedBooking,
  onCancelBooking,
  onRejectBooking,
  cancelBookingLoading,
  rejectBookingLoading
}: EnhancedBookingsDashboardDialogsProps) {
  return (
    <>
      {/* MessageDialog removed as we now redirect to /messages */}

      {selectedBooking && (
        <>
          <CancelBookingDialog
            open={cancelDialogOpen}
            onOpenChange={setCancelDialogOpen}
            booking={selectedBooking}
            onConfirm={onCancelBooking}
            isLoading={cancelBookingLoading}
          />

          <RejectBookingDialog
            open={rejectDialogOpen}
            onOpenChange={setRejectDialogOpen}
            booking={selectedBooking}
            onConfirm={onRejectBooking}
            isLoading={rejectBookingLoading}
          />
        </>
      )}
    </>
  );
}
