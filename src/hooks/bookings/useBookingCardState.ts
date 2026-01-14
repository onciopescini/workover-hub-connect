import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isBefore, addMinutes } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { BookingWithDetails } from "@/types/booking";
import { BookingCardDisplayData, UserRole } from '@/types/bookings/bookings-ui.types';
import { BookingCardActions } from '@/types/bookings/bookings-actions.types';
import { sreLogger } from '@/lib/sre-logger';
import { getOrCreateConversation } from '@/lib/conversations';
import { supabase } from '@/integrations/supabase/client';

interface UseBookingCardStateProps {
  booking: BookingWithDetails;
  userRole: UserRole;
  /** @deprecated Replaced by direct navigation in useBookingCardState */
  onOpenMessageDialog?: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
}

export const useBookingCardState = ({
  booking,
  userRole,
  onOpenMessageDialog,
  onOpenCancelDialog
}: UseBookingCardStateProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
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
    onMessage: async () => {
      // Logic for redirecting to unified messages
      try {
        const hostId = booking.space?.host_id;
        const coworkerId = booking.user_id;

        if (!hostId || !coworkerId) {
          toast.error("Impossibile avviare la chat: dati mancanti");
          return;
        }

        const conversationId = await getOrCreateConversation({
          hostId,
          coworkerId,
          spaceId: booking.space_id,
          bookingId: booking.id
        });

        if (conversationId) {
          navigate(`/messages?id=${conversationId}`);
        }
      } catch (error) {
        console.error("Error creating conversation:", error);
        toast.error("Errore nell'apertura della chat");
      }
    },
    onCancel: () => onOpenCancelDialog(booking),
    onApprove: async () => {
      try {
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', booking.id);

        if (error) throw error;

        toast.success("Prenotazione confermata con successo");
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['host-activities'] });
      } catch (error) {
        console.error("Error approving booking:", error);
        toast.error("Errore durante l'approvazione della prenotazione");
      }
    },
    onReject: async () => {
      try {
        const reason = "Rifiutata dall'host";

        const { error } = await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            cancelled_by_host: true,
            cancellation_reason: reason
          })
          .eq('id', booking.id);

        if (error) throw error;

        toast.success("Prenotazione rifiutata");
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['host-activities'] });
      } catch (error) {
        console.error("Error rejecting booking:", error);
        toast.error("Errore durante il rifiuto della prenotazione");
      }
    }
  }), [booking, onOpenCancelDialog, navigate]);

  return {
    displayData,
    actions,
  };
};
