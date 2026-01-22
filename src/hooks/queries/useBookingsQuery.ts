import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookingWithDetails } from "@/types/booking";
import { cancelBooking } from "@/lib/booking-utils";
import { logger } from "@/lib/logger";
import { sreLogger } from '@/lib/sre-logger';
import { queryKeys } from "@/lib/react-query-config";

type SpaceSummary = {
  id: string;
  title: string;
  address: string;
  photos: string[] | null;
  host_id: string;
  price_per_day: number | null;
};

type CoworkerBookingRow = {
  id: string;
  space_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancellation_fee: number | null;
  cancelled_by_host: boolean | null;
  cancellation_reason: string | null;
  service_completed_at: string | null;
  space: SpaceSummary | null;
};

type HostBookingRow = CoworkerBookingRow & {
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    profile_photo_url: string | null;
  } | null;
};

const toString = (value: unknown): string => (typeof value === "string" ? value : "");
const toNumber = (value: unknown): number => (typeof value === "number" ? value : 0);

// Fetch function for bookings
const fetchBookings = async (userId: string, userRoles: string[]): Promise<BookingWithDetails[]> => {
  logger.debug('Fetching bookings for user', { component: 'useBookingsQuery', userId });

  // Fetch bookings where user is the coworker
  // Force casting to avoid SelectQueryError with the relation join
  const { data: coworkerBookingsRaw, error: coworkerError } = (await supabase
    .from("bookings")
    .select(`
      *,
      space:spaces!inner (
        id,
        title,
        address,
        photos,
        host_id,
        price_per_day
      )
    `)
    .eq("user_id", userId)
    .order("booking_date", { ascending: false })) as unknown as {
    data: CoworkerBookingRow[] | null;
    error: unknown;
  };

  if (coworkerError) {
    sreLogger.error('Coworker bookings error', { userId }, coworkerError);
    throw coworkerError;
  }

  // Get user's spaces for host bookings
  let hostBookings: HostBookingRow[] = [];
  const isHostOrAdmin = (userRoles || []).includes("host") || (userRoles || []).includes("admin");
  if (isHostOrAdmin) {
    const { data: hostBookingsRaw, error: hostError } = (await supabase
      .from("bookings")
      .select(`
        *,
        space:spaces!inner (
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
      .eq("space.host_id", userId)
      .neq("user_id", userId)
      .order("booking_date", { ascending: false })) as unknown as {
      data: HostBookingRow[] | null;
      error: unknown;
    };

    if (!hostError && hostBookingsRaw) {
      hostBookings = hostBookingsRaw;
    } else if (hostError) {
      sreLogger.error('Host bookings error', { userId }, hostError);
    }
  }

  // Transform bookings to match BookingWithDetails interface
  const transformCoworkerBookings = (coworkerBookingsRaw || []).map((booking) => {
    return {
      id: toString(booking.id),
      space_id: toString(booking.space_id),
      user_id: toString(booking.user_id),
      booking_date: toString(booking.booking_date),
      start_time: toString(booking.start_time),
      end_time: toString(booking.end_time),
      status: toString(booking.status),
      created_at: toString(booking.created_at),
      updated_at: toString(booking.updated_at),
      cancelled_at: booking.cancelled_at ?? "",
      cancellation_fee: toNumber(booking.cancellation_fee),
      cancelled_by_host: Boolean(booking.cancelled_by_host),
      cancellation_reason: booking.cancellation_reason ?? "",
      service_completed_at: booking.service_completed_at,
      space: {
        id: toString(booking.space?.id),
        title: toString(booking.space?.title),
        address: toString(booking.space?.address),
        photos: booking.space?.photos ?? [],
        image_url: booking.space?.photos?.[0] || '',
        type: 'space',
        host_id: toString(booking.space?.host_id),
        price_per_day: toNumber(booking.space?.price_per_day)
      },
      coworker: null
    };
  });

  const transformHostBookings = hostBookings.map((booking) => {
    return {
      id: toString(booking.id),
      space_id: toString(booking.space_id),
      user_id: toString(booking.user_id),
      booking_date: toString(booking.booking_date),
      start_time: toString(booking.start_time),
      end_time: toString(booking.end_time),
      status: toString(booking.status),
      created_at: toString(booking.created_at),
      updated_at: toString(booking.updated_at),
      cancelled_at: booking.cancelled_at ?? "",
      cancellation_fee: toNumber(booking.cancellation_fee),
      cancelled_by_host: Boolean(booking.cancelled_by_host),
      cancellation_reason: booking.cancellation_reason ?? "",
      service_completed_at: booking.service_completed_at,
      space: {
        id: toString(booking.space?.id),
        title: toString(booking.space?.title),
        address: toString(booking.space?.address),
        photos: booking.space?.photos ?? [],
        image_url: booking.space?.photos?.[0] || '',
        type: 'space',
        host_id: toString(booking.space?.host_id),
        price_per_day: toNumber(booking.space?.price_per_day)
      },
      coworker: {
        id: toString(booking.profiles?.id),
        first_name: booking.profiles?.first_name ?? "",
        last_name: booking.profiles?.last_name ?? "",
        profile_photo_url: booking.profiles?.profile_photo_url ?? ""
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
    queryKey: queryKeys.bookings.list(authState.user?.id || ''),
    queryFn: () => fetchBookings(authState.user?.id || '', authState.roles),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      toast.success("Prenotazione cancellata con successo");
    },
    onError: (error) => {
      sreLogger.error("Error cancelling booking", {}, error as Error);
      toast.error("Errore nella cancellazione della prenotazione");
    },
  });
};
