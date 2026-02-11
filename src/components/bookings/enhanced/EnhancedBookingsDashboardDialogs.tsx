import React from 'react';
import { CancelBookingDialog } from '../CancelBookingDialog';
import { RejectBookingDialog } from '../RejectBookingDialog';
import { BookingDisputeDialog } from '../BookingDisputeDialog';
import { BookingWithDetails } from '@/types/booking';

interface EnhancedBookingsDashboardDialogsProps {
  messageDialogOpen: boolean;
  setMessageDialogOpen: (open: boolean) => void;
  messageBookingId: string;
  messageSpaceTitle: string;
  cancelDialogOpen: boolean;
  setCancelDialogOpen: (open: boolean) => void;
  disputeDialogOpen: boolean;
  setDisputeDialogOpen: (open: boolean) => void;
  rejectDialogOpen: boolean;
  setRejectDialogOpen: (open: boolean) => void;
  selectedBooking: BookingWithDetails | null;
  onCancelBooking: (reason?: string) => Promise<void>;
  onSubmitDispute: (reason: string) => Promise<void>;
  onRejectBooking: (reason: string) => Promise<void>;
  cancelBookingLoading: boolean;
  disputeBookingLoading: boolean;
  rejectBookingLoading: boolean;
}

export function EnhancedBookingsDashboardDialogs({
  cancelDialogOpen,
  setCancelDialogOpen,
  disputeDialogOpen,
  setDisputeDialogOpen,
  rejectDialogOpen,
  setRejectDialogOpen,
  selectedBooking,
  onCancelBooking,
  onSubmitDispute,
  onRejectBooking,
  cancelBookingLoading,
  disputeBookingLoading,
  rejectBookingLoading,
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

          <BookingDisputeDialog
            open={disputeDialogOpen}
            onOpenChange={setDisputeDialogOpen}
            booking={selectedBooking}
            onConfirm={onSubmitDispute}
            isLoading={disputeBookingLoading}
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
