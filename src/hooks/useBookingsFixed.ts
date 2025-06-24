import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/OptimizedAuthContext';
import { supabase } from '@/integrations/supabase/client';

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

export const useBookingsFixed = () => {
  const { authState } = useAuth();
  const [bookings, setBookings] = useState<BookingWithSpace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!authState.user) {
          setError('User not authenticated');
          return;
        }

        const { data, error } = await supabase
          .from<Booking>('bookings')
          .select(`
            *,
            spaces (
              id,
              title,
              address
            )
          `)
          .eq('user_id', authState.user.id);

        if (error) {
          console.error('Error fetching bookings:', error);
          setError(error.message);
        } else {
          // Type assertion to ensure 'spaces' is always an object
          const typedData: BookingWithSpace[] = data
            ? data.map(booking => ({
                ...booking,
                space: booking.spaces as Space,
              }))
            : [];
          setBookings(typedData);
        }
      } catch (err: any) {
        console.error('Unexpected error:', err);
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (authState.user) {
      fetchBookings();
    }
  }, [authState.user]);

  const cancelBooking = async (bookingId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from<Booking>('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) {
        console.error('Error cancelling booking:', error);
        setError(error.message);
        toast.error('Failed to cancel booking');
      } else {
        setBookings(prevBookings =>
          prevBookings.map(booking =>
            booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking
          )
        );
        toast.success('Booking cancelled successfully');
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message || 'An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    bookings,
    isLoading,
    error,
    cancelBooking,
  };
};
