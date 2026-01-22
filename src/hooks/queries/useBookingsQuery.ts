import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Booking, BookingWithDetails } from "@/types/booking";
import { cancelBooking } from "@/lib/booking-utils";
import { logger } from "@/lib/logger";
import { sreLogger } from '@/lib/sre-logger';

type SpaceSummary = {
  id: string | null;
  title: string | null;
  address: string | null;
  photos: string[] | null;
  host_id: string | null;
  price_per_day: number | null;
};

type CoworkerBookingRow = Booking & {
  space: SpaceSummary | null;
};

type HostBookingRow = Booking & {
  space: SpaceSummary | null;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    profile_photo_url: string | null;
  } | null;
};

const toString = (value: string | null | undefined) => value ?? '';
const toNumber = (value: number | null | undefined) => value ?? 0;

// Query Keys
export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (userId: string) => [...bookingKeys.lists(), userId] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
};

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
      error: PostgrestError | null;
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
        error: PostgrestError | null;
      };

    if (!hostError && hostBookingsRaw) {
      hostBookings = hostBookingsRaw;
    } else if (hostError) {
      sreLogger.error('Host bookings error', { userId }, hostError);
    }
  }

  // Transform bookings to match BookingWithDetails interface
  const transformCoworkerBookings = (coworkerBookingsRaw || []).map(booking => {
    // Safe cast of known structure from Supabase query
    const bookingData = booking;
    const space = bookingData.space;
    return {
      id: toString(bookingData.id),
      space_id: toString(bookingData.space_id),
      user_id: toString(bookingData.user_id),
      booking_date: toString(bookingData.booking_date),
      start_time: toString(bookingData.start_time),
      end_time: toString(bookingData.end_time),
      status: bookingData.status ?? 'pending',
      created_at: toString(bookingData.created_at),
      updated_at: toString(bookingData.updated_at),
      cancelled_at: bookingData.cancelled_at ?? null,
      cancellation_fee: bookingData.cancellation_fee ?? null,
      cancelled_by_host: bookingData.cancelled_by_host ?? null,
      cancellation_reason: bookingData.cancellation_reason ?? null,
      service_completed_at: bookingData.service_completed_at ?? null,
      space: {
        id: toString(space?.id),
        title: toString(space?.title),
        address: toString(space?.address),
        photos: space?.photos ?? [],
        image_url: space?.photos?.[0] || '',
        type: 'space',
        host_id: toString(space?.host_id),
        price_per_day: toNumber(space?.price_per_day)
      },
      coworker: null
    };
  });

  const transformHostBookings = hostBookings.map(booking => {
    // Safe cast of known structure from Supabase query
    const bookingData = booking;
    const space = bookingData.space;
    return {
      id: toString(bookingData.id),
      space_id: toString(bookingData.space_id),
      user_id: toString(bookingData.user_id),
      booking_date: toString(bookingData.booking_date),
      start_time: toString(bookingData.start_time),
      end_time: toString(bookingData.end_time),
      status: bookingData.status ?? 'pending',
      created_at: toString(bookingData.created_at),
      updated_at: toString(bookingData.updated_at),
      cancelled_at: bookingData.cancelled_at ?? null,
      cancellation_fee: bookingData.cancellation_fee ?? null,
      cancelled_by_host: bookingData.cancelled_by_host ?? null,
      cancellation_reason: bookingData.cancellation_reason ?? null,
      service_completed_at: bookingData.service_completed_at ?? null,
      space: {
        id: toString(space?.id),
        title: toString(space?.title),
        address: toString(space?.address),
        photos: space?.photos ?? [],
        image_url: space?.photos?.[0] || '',
        type: 'space',
        host_id: toString(space?.host_id),
        price_per_day: toNumber(space?.price_per_day)
      },
      coworker: {
        id: toString(bookingData.profiles?.id),
        first_name: toString(bookingData.profiles?.first_name),
        last_name: toString(bookingData.profiles?.last_name),
        profile_photo_url: bookingData.profiles?.profile_photo_url ?? null
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
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success("Prenotazione cancellata con successo");
    },
    onError: (error) => {
      sreLogger.error("Error cancelling booking", {}, error as Error);
      toast.error("Errore nella cancellazione della prenotazione");
    },
  });
};
