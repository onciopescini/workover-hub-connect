
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookingWithDetails } from "@/types/booking";

export type BookingFilter = {
  status?: 'pending' | 'confirmed' | 'cancelled';
  dateRange?: { start: string; end: string };
  spaceId?: string;
  searchTerm?: string;
};

// Enhanced fetch function with proper error handling and optimization
const fetchEnhancedBookings = async (userId: string, userRole?: string, filters?: BookingFilter): Promise<BookingWithDetails[]> => {
  console.log('🔍 Fetching enhanced bookings for user:', userId, 'role:', userRole);

  try {
    let coworkerBookings: any[] = [];
    let hostBookings: any[] = [];

    // Fetch bookings where user is the coworker (guest)
    let coworkerQuery = supabase
      .from("bookings")
      .select(`
        *,
        spaces!inner (
          id,
          title,
          address,
          photos,
          host_id,
          price_per_day,
          confirmation_type
        ),
        payments (
          id,
          payment_status,
          amount,
          created_at
        )
      `)
      .eq("user_id", userId)
      .order("booking_date", { ascending: false });

    // Apply filters to coworker query
    if (filters?.status) {
      coworkerQuery = coworkerQuery.eq("status", filters.status);
    }
    if (filters?.dateRange) {
      coworkerQuery = coworkerQuery
        .gte("booking_date", filters.dateRange.start)
        .lte("booking_date", filters.dateRange.end);
    }
    if (filters?.spaceId) {
      coworkerQuery = coworkerQuery.eq("space_id", filters.spaceId);
    }

    const { data: coworkerData, error: coworkerError } = await coworkerQuery;

    if (coworkerError) {
      console.error('❌ Coworker bookings error:', coworkerError);
      throw coworkerError;
    }

    coworkerBookings = coworkerData || [];

    // Fetch bookings where user is the host (if user has host role)
    if (userRole === "host" || userRole === "admin") {
      // First get user's spaces
      const { data: userSpaces, error: spacesError } = await supabase
        .from("spaces")
        .select("id")
        .eq("host_id", userId);

      if (spacesError) {
        console.error('❌ User spaces error:', spacesError);
      } else if (userSpaces && userSpaces.length > 0) {
        const spaceIds = userSpaces.map(space => space.id);

        let hostQuery = supabase
          .from("bookings")
          .select(`
            *,
            spaces!inner (
              id,
              title,
              address,
              photos,
              host_id,
              price_per_day,
              confirmation_type
            ),
            profiles!bookings_user_id_fkey (
              id,
              first_name,
              last_name,
              profile_photo_url
            ),
            payments (
              id,
              payment_status,
              amount,
              created_at
            )
          `)
          .in("space_id", spaceIds)
          .neq("user_id", userId) // Don't include own bookings
          .order("booking_date", { ascending: false });

        // Apply filters to host query
        if (filters?.status) {
          hostQuery = hostQuery.eq("status", filters.status);
        }
        if (filters?.dateRange) {
          hostQuery = hostQuery
            .gte("booking_date", filters.dateRange.start)
            .lte("booking_date", filters.dateRange.end);
        }
        if (filters?.spaceId) {
          hostQuery = hostQuery.eq("space_id", filters.spaceId);
        }

        const { data: hostData, error: hostError } = await hostQuery;

        if (hostError) {
          console.error('❌ Host bookings error:', hostError);
        } else {
          hostBookings = hostData || [];
        }
      }
    }

    // Transform and merge bookings
    const transformedCoworkerBookings: BookingWithDetails[] = coworkerBookings.map(booking => ({
      id: booking.id,
      space_id: booking.space_id,
      user_id: booking.user_id,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: booking.status as 'pending' | 'confirmed' | 'cancelled',
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      cancelled_at: booking.cancelled_at,
      cancellation_fee: booking.cancellation_fee,
      cancelled_by_host: booking.cancelled_by_host,
      cancellation_reason: booking.cancellation_reason,
      slot_reserved_until: booking.slot_reserved_until,
      payment_required: booking.payment_required,
      payment_session_id: booking.payment_session_id,
      reservation_token: booking.reservation_token,
      space: {
        id: booking.spaces.id,
        title: booking.spaces.title,
        address: booking.spaces.address,
        photos: booking.spaces.photos || [],
        host_id: booking.spaces.host_id,
        price_per_day: booking.spaces.price_per_day,
        confirmation_type: booking.spaces.confirmation_type
      },
      coworker: null, // User is the coworker
      payments: booking.payments || []
    }));

    const transformedHostBookings: BookingWithDetails[] = hostBookings.map(booking => ({
      id: booking.id,
      space_id: booking.space_id,
      user_id: booking.user_id,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: booking.status as 'pending' | 'confirmed' | 'cancelled',
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      cancelled_at: booking.cancelled_at,
      cancellation_fee: booking.cancellation_fee,
      cancelled_by_host: booking.cancelled_by_host,
      cancellation_reason: booking.cancellation_reason,
      slot_reserved_until: booking.slot_reserved_until,
      payment_required: booking.payment_required,
      payment_session_id: booking.payment_session_id,
      reservation_token: booking.reservation_token,
      space: {
        id: booking.spaces.id,
        title: booking.spaces.title,
        address: booking.spaces.address,
        photos: booking.spaces.photos || [],
        host_id: booking.spaces.host_id,
        price_per_day: booking.spaces.price_per_day,
        confirmation_type: booking.spaces.confirmation_type
      },
      coworker: booking.profiles ? {
        id: booking.profiles.id,
        first_name: booking.profiles.first_name,
        last_name: booking.profiles.last_name,
        profile_photo_url: booking.profiles.profile_photo_url
      } : null,
      payments: booking.payments || []
    }));

    // Combine and remove duplicates
    const allBookings = [...transformedCoworkerBookings, ...transformedHostBookings];
    const uniqueBookings = allBookings.filter((booking, index, self) => 
      index === self.findIndex(b => b.id === booking.id)
    );

    // Apply search filter if provided
    let filteredBookings = uniqueBookings;
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filteredBookings = uniqueBookings.filter(booking =>
        booking.space.title.toLowerCase().includes(searchLower) ||
        booking.space.address.toLowerCase().includes(searchLower) ||
        (booking.coworker && 
          `${booking.coworker.first_name} ${booking.coworker.last_name}`.toLowerCase().includes(searchLower))
      );
    }

    console.log('✅ Successfully fetched', filteredBookings.length, 'enhanced bookings');
    return filteredBookings;

  } catch (error) {
    console.error('❌ Error fetching enhanced bookings:', error);
    throw error;
  }
};

// Main enhanced bookings query hook
export const useEnhancedBookingsQuery = (filters?: BookingFilter) => {
  const { authState } = useAuth();
  
  return useQuery({
    queryKey: ['enhanced-bookings', authState.user?.id, authState.profile?.role, filters],
    queryFn: () => fetchEnhancedBookings(
      authState.user?.id || '', 
      authState.profile?.role,
      filters
    ),
    enabled: !!authState.user?.id,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Enhanced cancel booking mutation
export const useEnhancedCancelBookingMutation = () => {
  const queryClient = useQueryClient();
  const { authState } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      isHost, 
      reason 
    }: { 
      bookingId: string; 
      isHost: boolean; 
      reason?: string;
    }) => {
      console.log('🔄 Cancelling booking:', bookingId);
      
      const { data, error } = await supabase.rpc('cancel_booking', {
        booking_id: bookingId,
        cancelled_by_host: isHost,
        reason: reason
      });

      if (error) {
        console.error('❌ Cancel booking error:', error);
        throw error;
      }

      console.log('✅ Booking cancelled successfully');
      return data;
    },
    onSuccess: () => {
      // Invalidate all booking-related queries
      queryClient.invalidateQueries({ queryKey: ['enhanced-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['host-dashboard-metrics'] });
      toast.success("Prenotazione cancellata con successo");
    },
    onError: (error: any) => {
      console.error("❌ Error cancelling booking:", error);
      toast.error(`Errore nella cancellazione: ${error.message || 'Errore sconosciuto'}`);
    },
  });
};
