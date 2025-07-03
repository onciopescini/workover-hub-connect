import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookingWithDetails } from "@/types/booking";
import { cancelBooking } from "@/lib/booking-utils";

// Query Keys
export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (userId: string) => [...bookingKeys.lists(), userId] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
};

// Fetch function for bookings
const fetchBookings = async (userId: string, userRole?: string): Promise<BookingWithDetails[]> => {
  console.log('Fetching bookings for user:', userId);

  // Fetch bookings where user is the coworker
  const { data: coworkerBookingsRaw, error: coworkerError } = await supabase
    .from("bookings")
    .select(`
      *,
      spaces!inner (
        id,
        title,
        address,
        photos,
        host_id,
        price_per_day
      )
    `)
    .eq("user_id", userId)
    .order("booking_date", { ascending: false });

  if (coworkerError) {
    console.error('Coworker bookings error:', coworkerError);
    throw coworkerError;
  }

  // Get user's spaces for host bookings
  let hostBookings: Array<Record<string, unknown>> = [];
  if (userRole === "host" || userRole === "admin") {
    const { data: hostBookingsRaw, error: hostError } = await supabase
      .from("bookings")
      .select(`
        *,
        spaces!inner (
          id,
          title,
          address,
          photos,
          host_id,
          price_per_day
        ),
        profiles!inner (
          id,
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .eq("spaces.host_id", userId)
      .neq("user_id", userId)
      .order("booking_date", { ascending: false });

    if (!hostError && hostBookingsRaw) {
      hostBookings = hostBookingsRaw;
    } else if (hostError) {
      console.error('Host bookings error:', hostError);
    }
  }

  // Transform bookings to match BookingWithDetails interface
  const transformCoworkerBookings = (coworkerBookingsRaw || []).map(booking => ({
    id: booking.id,
    space_id: booking.space_id,
    user_id: booking.user_id,
    booking_date: booking.booking_date,
    start_time: booking.start_time,
    end_time: booking.end_time,
    status: booking.status,
    created_at: booking.created_at,
    updated_at: booking.updated_at,
    cancelled_at: booking.cancelled_at,
    cancellation_fee: booking.cancellation_fee,
    cancelled_by_host: booking.cancelled_by_host,
    cancellation_reason: booking.cancellation_reason,
    space: {
      id: booking.spaces.id,
      title: booking.spaces.title,
      address: booking.spaces.address,
      photos: booking.spaces.photos,
      host_id: booking.spaces.host_id,
      price_per_day: booking.spaces.price_per_day
    },
    coworker: null
  }));

  const transformHostBookings = hostBookings.map(booking => ({
    id: booking.id,
    space_id: booking.space_id,
    user_id: booking.user_id,
    booking_date: booking.booking_date,
    start_time: booking.start_time,
    end_time: booking.end_time,
    status: booking.status,
    created_at: booking.created_at,
    updated_at: booking.updated_at,
    cancelled_at: booking.cancelled_at,
    cancellation_fee: booking.cancellation_fee,
    cancelled_by_host: booking.cancelled_by_host,
    cancellation_reason: booking.cancellation_reason,
    space: {
      id: booking.spaces.id,
      title: booking.spaces.title,
      address: booking.spaces.address,
      photos: booking.spaces.photos,
      host_id: booking.spaces.host_id,
      price_per_day: booking.spaces.price_per_day
    },
    coworker: {
      id: booking.profiles.id,
      first_name: booking.profiles.first_name,
      last_name: booking.profiles.last_name,
      profile_photo_url: booking.profiles.profile_photo_url
    }
  }));

  // Combine and remove duplicates
  const allBookings = [...transformCoworkerBookings, ...transformHostBookings];
  const uniqueBookings = allBookings.filter((booking, index, self) => 
    index === self.findIndex(b => b.id === booking.id)
  );

  return uniqueBookings;
};

// Main bookings query hook
export const useBookingsQuery = () => {
  const { authState } = useAuth();
  
  return useQuery({
    queryKey: bookingKeys.list(authState.user?.id || ''),
    queryFn: () => fetchBookings(authState.user?.id || '', authState.profile?.role),
    enabled: !!authState.user?.id,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

// Cancel booking mutation
export const useCancelBookingMutation = () => {
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
      const result = await cancelBooking(bookingId, isHost, reason);
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel booking');
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate bookings queries
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success("Prenotazione cancellata con successo");
    },
    onError: (error) => {
      console.error("Error cancelling booking:", error);
      toast.error("Errore nella cancellazione della prenotazione");
    },
  });
};
