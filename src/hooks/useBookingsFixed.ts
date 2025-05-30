
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookingWithDetails } from "@/types/booking";

export const useBookingsFixed = () => {
  const { authState } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!authState.user) {
      setIsLoading(false);
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setIsLoading(true);
      console.log('Fetching bookings for user:', authState.user.id);

      // Fetch bookings where user is the coworker - Corrected query
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
        .eq("user_id", authState.user.id)
        .order("booking_date", { ascending: false });

      if (signal.aborted) return;

      if (coworkerError) {
        console.error('Coworker bookings error:', coworkerError);
        throw coworkerError;
      }

      // Get user's spaces for host bookings
      let hostBookings: any[] = [];
      if (authState.profile?.role === "host" || authState.profile?.role === "admin") {
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
          .eq("spaces.host_id", authState.user.id)
          .neq("user_id", authState.user.id)
          .order("booking_date", { ascending: false });

        if (signal.aborted) return;

        if (!hostError && hostBookingsRaw) {
          hostBookings = hostBookingsRaw;
        } else if (hostError) {
          console.error('Host bookings error:', hostError);
        }
      }

      // Transform all bookings to match BookingWithDetails interface
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
        coworker: null // Current user is the coworker
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

      // Combine all bookings
      const allBookings = [...transformCoworkerBookings, ...transformHostBookings];

      // Remove duplicates
      const uniqueBookings = allBookings.filter((booking, index, self) => 
        index === self.findIndex(b => b.id === booking.id)
      );

      if (!signal.aborted) {
        setBookings(uniqueBookings);
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error fetching bookings:", error);
        toast.error("Errore nel caricamento delle prenotazioni");
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [authState.user?.id, authState.profile?.role]);

  useEffect(() => {
    fetchBookings();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchBookings]);

  return { bookings, setBookings, isLoading, refetch: fetchBookings };
};
