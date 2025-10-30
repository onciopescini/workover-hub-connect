
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

interface Booking {
  id: string;
  space_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Space {
  id: string;
  title: string;
  address: string;
}

interface BookingWithSpace extends Booking {
  space: Space;
}

export const useBookings = () => {
  const [bookings, setBookings] = useState<BookingWithSpace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { authState } = useAuth();

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!authState.user) {
          setError('User not authenticated');
          return;
        }

        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id,
            space_id,
            user_id,
            booking_date,
            start_time,
            end_time,
            status,
            created_at,
            updated_at,
            service_completed_at,
            space:spaces (
              id,
              title,
              address
            )
          `)
          .eq('user_id', authState.user.id);

        if (error) {
          sreLogger.error('Error fetching bookings', {}, error);
          setError(error.message);
        } else {
          // Flatten the structure
          const formattedBookings = data ? data.map(booking => ({
            id: booking.id,
            space_id: booking.space_id,
            user_id: booking.user_id,
            booking_date: booking.booking_date,
            start_time: booking.start_time ?? '',
            end_time: booking.end_time ?? '',
            status: booking.status ?? 'pending',
            created_at: booking.created_at ?? '',
            updated_at: booking.updated_at ?? '',
            service_completed_at: booking.service_completed_at ?? null,
            space: booking.space as Space,
          })) : [];
          setBookings(formattedBookings);
        }
      } catch (err: unknown) {
        sreLogger.error('Unexpected error fetching bookings', {}, err as Error);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (authState.user) {
      fetchBookings();
    }
  }, [authState.user]);

  const cancelBooking = async (bookingId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) {
        sreLogger.error('Error cancelling booking', { bookingId }, error);
        setError(error.message);
        toast.error(`Failed to cancel booking: ${error.message}`);
      } else {
        // Optimistically update the state
        setBookings(bookings =>
          bookings.map(booking =>
            booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking
          )
        );
        toast.success('Booking cancelled successfully!');
      }
    } catch (err: unknown) {
      sreLogger.error('Unexpected error cancelling booking', {}, err as Error);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(`Unexpected error cancelling booking: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    bookings,
    loading,
    error,
    cancelBooking,
  };
};
