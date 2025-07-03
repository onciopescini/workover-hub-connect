
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/useAuth';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            *,
            space:spaces (
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
          // Transform the data to match our interface
          const typedData: BookingWithSpace[] = data
            ? data.map(booking => ({
                ...booking,
                space: booking.space as Space,
              }))
            : [];
          setBookings(typedData);
        }
      } catch (err: any) {
        console.error('Unexpected error:', err);
        setError(err.message || 'An unexpected error occurred');
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
