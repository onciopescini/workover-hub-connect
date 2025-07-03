import { useMemo } from 'react';
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { BookingWithDetails } from "@/types/booking";
import { BookingCardDisplayData, UserRole } from '@/types/bookings/bookings-ui.types';
import { BookingCardActions } from '@/types/bookings/bookings-actions.types';

interface UseBookingCardStateProps {
  booking: BookingWithDetails;
  userRole: UserRole;
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
}

export const useBookingCardState = ({
  booking,
  userRole,
  onOpenMessageDialog,
  onOpenCancelDialog
}: UseBookingCardStateProps) => {
  
  const displayData: BookingCardDisplayData = useMemo(() => {
    const getOtherParty = () => {
      if (userRole === "host") {
        // Show coworker info
        return {
          id: booking.user_id,
          name: `${booking.coworker?.first_name || ''} ${booking.coworker?.last_name || ''}`.trim() || 'Coworker',
          photo: booking.coworker?.profile_photo_url ?? null,
          role: "Coworker"
        };
      } else {
        // For coworker view, show host info
        return {
          id: booking.space?.host_id || '',
          name: booking.space?.title || "Spazio",
          photo: null,
          role: "Host"
        };
      }
    };

    const canCancel = booking.status === "confirmed" || booking.status === "pending";
    const showReviewButton = booking.status === 'confirmed';
    const otherParty = getOtherParty();
    const formattedDate = format(new Date(booking.booking_date), "EEEE d MMMM yyyy", { locale: it });

    return {
      otherParty,
      formattedDate,
      canCancel,
      showReviewButton,
    };
  }, [booking, userRole]);

  const actions: BookingCardActions = useMemo(() => ({
    onMessage: () => onOpenMessageDialog(booking.id, booking.space?.title || "Spazio"),
    onCancel: () => onOpenCancelDialog(booking),
  }), [booking, onOpenMessageDialog, onOpenCancelDialog]);

  return {
    displayData,
    actions,
  };
};