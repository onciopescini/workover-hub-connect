import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookingWithDetails } from "@/types/booking";
import { cancelBooking } from "@/lib/booking-utils";
import { logger } from "@/lib/logger";

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
  logger.debug('Fetching bookings for user', { component: 'useBookingsQuery', userId });

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
  const transformCoworkerBookings = (coworkerBookingsRaw || []).map(booking => {
    // Safe cast of known structure from Supabase query
    const bookingData = booking as any;
    return {
      id: bookingData.id as string,
      space_id: bookingData.space_id as string,
      user_id: bookingData.user_id as string,
      booking_date: bookingData.booking_date as string,
      start_time: bookingData.start_time as string,
      end_time: bookingData.end_time as string,
      status: bookingData.status as "pending" | "confirmed" | "cancelled",
      created_at: bookingData.created_at as string,
      updated_at: bookingData.updated_at as string,
      cancelled_at: bookingData.cancelled_at as string,
      cancellation_fee: bookingData.cancellation_fee as number,
      cancelled_by_host: bookingData.cancelled_by_host as boolean,
      cancellation_reason: bookingData.cancellation_reason as string,
      space: {
        id: bookingData.spaces?.id as string,
        title: bookingData.spaces?.title as string,
        address: bookingData.spaces?.address as string,
        photos: bookingData.spaces?.photos as string[],
        host_id: bookingData.spaces?.host_id as string,
        price_per_day: bookingData.spaces?.price_per_day as number
      },
      coworker: null
    };
  });

  const transformHostBookings = hostBookings.map(booking => {
    // Safe cast of known structure from Supabase query
    const bookingData = booking as any;
    return {
      id: bookingData.id as string,
      space_id: bookingData.space_id as string,
      user_id: bookingData.user_id as string,
      booking_date: bookingData.booking_date as string,
      start_time: bookingData.start_time as string,
      end_time: bookingData.end_time as string,
      status: bookingData.status as "pending" | "confirmed" | "cancelled",
      created_at: bookingData.created_at as string,
      updated_at: bookingData.updated_at as string,
      cancelled_at: bookingData.cancelled_at as string,
      cancellation_fee: bookingData.cancellation_fee as number,
      cancelled_by_host: bookingData.cancelled_by_host as boolean,
      cancellation_reason: bookingData.cancellation_reason as string,
      space: {
        id: bookingData.spaces?.id as string,
        title: bookingData.spaces?.title as string,
        address: bookingData.spaces?.address as string,
        photos: bookingData.spaces?.photos as string[],
        host_id: bookingData.spaces?.host_id as string,
        price_per_day: bookingData.spaces?.price_per_day as number
      },
      coworker: {
        id: bookingData.profiles?.id as string,
        first_name: bookingData.profiles?.first_name as string,
        last_name: bookingData.profiles?.last_name as string,
        profile_photo_url: bookingData.profiles?.profile_photo_url as string
      }
    };
  });

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
