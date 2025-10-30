import { useMemo } from 'react';
import { format, parseISO, isBefore, addMinutes } from "date-fns";
import { it } from "date-fns/locale";
import { BookingWithDetails } from "@/types/booking";
import { BookingCardDisplayData, UserRole } from '@/types/bookings/bookings-ui.types';
import { BookingCardActions } from '@/types/bookings/bookings-actions.types';
import { sreLogger } from '@/lib/sre-logger';

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

    // Check if we can cancel based on status and time
    const canCancelByStatus = booking.status === "confirmed" || booking.status === "pending";
    
    // Check if we're before the booking start time using a more robust approach
    const now = new Date();
    let canCancelByTime = true;
    
    if (booking.booking_date && booking.start_time) {
      try {
        // Create a more robust date string - ensure proper ISO format
        const dateTimeString = `${booking.booking_date}T${booking.start_time}`;
        const bookingStart = parseISO(dateTimeString);
        
        // Validate that the parsed date is valid
        if (isNaN(bookingStart.getTime())) {
          sreLogger.error('Invalid booking date/time', { 
            booking_date: booking.booking_date, 
            start_time: booking.start_time 
          });
          canCancelByTime = false;
        } else {
          // Can't cancel if current time is at or past the booking start time
          // Using strict comparison to ensure past bookings cannot be cancelled
          canCancelByTime = isBefore(now, bookingStart);
          
          // Additional safety check - if booking is more than 1 day in the past, definitely can't cancel
          const oneDayAgo = addMinutes(now, -24 * 60);
          if (isBefore(bookingStart, oneDayAgo)) {
            canCancelByTime = false;
          }
        }
        
        sreLogger.debug('Cancellation analysis', {
          rawBookingDate: booking.booking_date,
          rawStartTime: booking.start_time,
          dateTimeString,
          canCancelByTime,
          bookingId: booking.id,
          bookingStatus: booking.status
        });
      } catch (error) {
        sreLogger.error('Error parsing booking date/time', {
          booking_date: booking.booking_date,
          start_time: booking.start_time
        }, error as Error);
        // If there's an error parsing, don't allow cancellation for safety
        canCancelByTime = false;
      }
    } else {
      sreLogger.warn('Missing booking date or time', {
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        bookingId: booking.id
      });
      canCancelByTime = false;
    }
    
    const canCancel = canCancelByStatus && canCancelByTime;
    const showReviewButton = booking.status === 'served';
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