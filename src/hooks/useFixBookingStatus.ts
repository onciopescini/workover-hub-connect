
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

export const useFixBookingStatus = () => {
  const [isFixing, setIsFixing] = useState(false);

  const fixBookingStatus = async (bookingId: string) => {
    setIsFixing(true);
    
    try {
      sreLogger.debug('Fixing booking status', { bookingId });
      
      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        throw new Error('Booking not found');
      }
      
      // Fetch space details separately
      const { data: space, error: spaceError } = await supabase
        .from('spaces')
        .select('confirmation_type, title')
        .eq('id', booking.space_id)
        .single();
        
      if (spaceError || !space) {
        throw new Error('Space not found');
      }

      // Check if payment is completed
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('payment_status', 'completed')
        .single();

      if (paymentError || !payment) {
        throw new Error('Payment not completed');
      }

      // If space has instant confirmation and payment is completed, auto-confirm
      if (space.confirmation_type === 'instant' && booking.status === 'pending') {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ 
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingId);

        if (updateError) {
          throw updateError;
        }

        toast.success('Prenotazione confermata automaticamente!');
        
        // Send notification to user
        await supabase
          .from('user_notifications')
          .insert({
            user_id: booking.user_id,
            type: 'booking',
            title: 'Prenotazione confermata!',
            content: `La tua prenotazione presso "${space.title}" è stata confermata.`,
            metadata: {
              booking_id: bookingId,
              space_title: space.title
            }
          });

        return true;
      } else {
        toast.info('La prenotazione è già nel stato corretto');
        return false;
      }
    } catch (error) {
      sreLogger.error('Error fixing booking status', { bookingId }, error as Error);
      toast.error('Errore nella correzione dello stato della prenotazione');
      return false;
    } finally {
      setIsFixing(false);
    }
  };

  return { fixBookingStatus, isFixing };
};
