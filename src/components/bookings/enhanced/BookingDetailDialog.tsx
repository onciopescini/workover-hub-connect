import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EnhancedBookingCard } from '../EnhancedBookingCard';
import { BookingWithDetails } from '@/types/booking';

interface BookingDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingWithDetails | null;
  userRole: "host" | "coworker";
  isChatEnabled: boolean;
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
}

export const BookingDetailDialog: React.FC<BookingDetailDialogProps> = ({
  isOpen,
  onClose,
  booking,
  userRole,
  isChatEnabled,
  onOpenMessageDialog,
  onOpenCancelDialog
}) => {
  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-none bg-transparent shadow-none">
        <DialogHeader className="sr-only">
          <DialogTitle>Dettagli Prenotazione</DialogTitle>
        </DialogHeader>
        <EnhancedBookingCard
          booking={booking}
          userRole={userRole}
          isChatEnabled={isChatEnabled}
          onOpenMessageDialog={onOpenMessageDialog}
          onOpenCancelDialog={onOpenCancelDialog}
        />
      </DialogContent>
    </Dialog>
  );
};
