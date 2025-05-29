
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookingWithDetails, RawBookingData } from "@/types/booking";

export const useBookings = () => {
  const { authState } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!authState.user) return;

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

      // Fetch bookings where user is the coworker
      const { data: coworkerBookingsRaw, error: coworkerError } = await supabase
        .from("bookings")
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
          cancelled_at,
          cancellation_fee,
          cancelled_by_host,
          cancellation_reason
        `)
        .eq("user_id", authState.user.id)
        .order("booking_date", { ascending: false });

      if (signal.aborted) return;

      if (coworkerError) {
        console.error('Coworker bookings error:', coworkerError);
        throw coworkerError;
      }

      // Get space details for coworker bookings
      let coworkerBookings: BookingWithDetails[] = [];
      if (coworkerBookingsRaw && coworkerBookingsRaw.length > 0) {
        const spaceIds = coworkerBookingsRaw.map(b => b.space_id);
        const { data: spacesData, error: spacesError } = await supabase
          .from("spaces")
          .select(`
            id,
            title,
            address,
            photos,
            host_id,
            price_per_day
          `)
          .in("id", spaceIds);

        if (signal.aborted) return;

        if (spacesError) {
          console.error('Spaces fetch error:', spacesError);
          throw spacesError;
        }

        // Combine booking and space data
        coworkerBookings = coworkerBookingsRaw.map(booking => ({
          ...booking,
          space: spacesData?.find(space => space.id === booking.space_id) || {
            id: booking.space_id,
            title: 'Spazio non trovato',
            address: '',
            photos: [],
            host_id: '',
            price_per_day: 0
          },
          coworker: null
        })) as BookingWithDetails[];
      }

      // If user is a host, also fetch bookings for their spaces
      let hostBookings: BookingWithDetails[] = [];
      if (authState.profile?.role === "host" || authState.profile?.role === "admin") {
        // First get host's spaces
        const { data: userSpaces, error: spacesError } = await supabase
          .from("spaces")
          .select("id")
          .eq("host_id", authState.user.id);

        if (signal.aborted) return;

        if (spacesError) {
          console.error('User spaces error:', spacesError);
        } else if (userSpaces && userSpaces.length > 0) {
          const spaceIds = userSpaces.map(s => s.id);
          
          // Get bookings for host's spaces
          const { data: hostBookingsRaw, error: hostError } = await supabase
            .from("bookings")
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
              cancelled_at,
              cancellation_fee,
              cancelled_by_host,
              cancellation_reason
            `)
            .in("space_id", spaceIds)
            .neq("user_id", authState.user.id)
            .order("booking_date", { ascending: false });

          if (signal.aborted) return;

          if (hostError) {
            console.error('Host bookings error:', hostError);
          } else if (hostBookingsRaw && hostBookingsRaw.length > 0) {
            // Get space and coworker details
            const [spacesResponse, coworkersResponse] = await Promise.all([
              supabase
                .from("spaces")
                .select(`id, title, address, photos, host_id, price_per_day`)
                .in("id", spaceIds),
              supabase
                .from("profiles")
                .select(`id, first_name, last_name, profile_photo_url`)
                .in("id", hostBookingsRaw.map(b => b.user_id))
            ]);

            if (signal.aborted) return;

            if (spacesResponse.error) {
              console.error('Host spaces fetch error:', spacesResponse.error);
            }

            if (coworkersResponse.error) {
              console.error('Coworkers fetch error:', coworkersResponse.error);
            }

            // Combine host booking data
            hostBookings = hostBookingsRaw.map(booking => ({
              ...booking,
              space: spacesResponse.data?.find(space => space.id === booking.space_id) || {
                id: booking.space_id,
                title: 'Spazio non trovato',
                address: '',
                photos: [],
                host_id: authState.user?.id || '',
                price_per_day: 0
              },
              coworker: coworkersResponse.data?.find(coworker => coworker.id === booking.user_id) || null
            })) as BookingWithDetails[];
          }
        }
      }

      // Combine all bookings and remove duplicates
      const allBookings = [...coworkerBookings, ...hostBookings];
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

  return { bookings, setBookings, isLoading };
};
