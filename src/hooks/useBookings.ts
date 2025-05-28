
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookingWithDetails, RawBookingData } from "@/types/booking";

export const useBookings = () => {
  const { authState } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref per prevenire fetch multipli simultanei
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  
  // Debounce timer
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchBookings = useCallback(async () => {
    if (!authState.user) {
      setIsLoading(false);
      return;
    }

    // Prevenire fetch multipli simultanei
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }

    // Debouncing - non fare fetch se l'ultimo è stato fatto meno di 2 secondi fa
    const now = Date.now();
    if (now - lastFetchRef.current < 2000) {
      console.log('Debouncing fetch request...');
      return;
    }

    isFetchingRef.current = true;
    lastFetchRef.current = now;
    setError(null);

    try {
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

      if (coworkerError) {
        console.error('Coworker bookings error:', coworkerError);
        throw new Error(`Errore nel caricamento delle prenotazioni: ${coworkerError.message}`);
      }

      console.log('Raw coworker bookings:', coworkerBookingsRaw);

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

        if (spacesError) {
          console.error('Spaces fetch error:', spacesError);
          // Non bloccare tutto se non riusciamo a caricare i dettagli degli spazi
          console.warn('Failed to load space details, using fallback data');
        }

        // Combine booking and space data
        coworkerBookings = coworkerBookingsRaw.map(booking => ({
          ...booking,
          space: spacesData?.find(space => space.id === booking.space_id) || {
            id: booking.space_id,
            title: 'Spazio non disponibile',
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
        try {
          // First get host's spaces
          const { data: userSpaces, error: spacesError } = await supabase
            .from("spaces")
            .select("id")
            .eq("host_id", authState.user.id);

          if (spacesError) {
            console.error('User spaces error:', spacesError);
            // Non bloccare tutto se non riusciamo a caricare gli spazi dell'host
            console.warn('Failed to load host spaces, skipping host bookings');
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
              .neq("user_id", authState.user.id) // Exclude own bookings as coworker
              .order("booking_date", { ascending: false });

            if (hostError) {
              console.error('Host bookings error:', hostError);
              // Non bloccare tutto per errori delle prenotazioni host
              console.warn('Failed to load host bookings, using only coworker bookings');
            } else if (hostBookingsRaw && hostBookingsRaw.length > 0) {
              // Get space details
              const { data: hostSpacesData, error: hostSpacesError } = await supabase
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

              // Get coworker details
              const coworkerIds = hostBookingsRaw.map(b => b.user_id);
              const { data: coworkersData, error: coworkersError } = await supabase
                .from("profiles")
                .select(`
                  id,
                  first_name,
                  last_name,
                  profile_photo_url
                `)
                .in("id", coworkerIds);

              if (hostSpacesError || coworkersError) {
                console.warn('Failed to load complete host booking details, using fallback data');
              }

              // Combine host booking data
              hostBookings = hostBookingsRaw.map(booking => ({
                ...booking,
                space: hostSpacesData?.find(space => space.id === booking.space_id) || {
                  id: booking.space_id,
                  title: 'Spazio non disponibile',
                  address: '',
                  photos: [],
                  host_id: authState.user?.id || '',
                  price_per_day: 0
                },
                coworker: coworkersData?.find(coworker => coworker.id === booking.user_id) || null
              })) as BookingWithDetails[];
            }
          }
        } catch (hostError) {
          console.error('Error fetching host bookings:', hostError);
          // Continue with just coworker bookings
        }
      }

      // Combine all bookings and remove duplicates
      const allBookings = [...coworkerBookings, ...hostBookings];
      const uniqueBookings = allBookings.filter((booking, index, self) => 
        index === self.findIndex(b => b.id === booking.id)
      );

      console.log('All unique bookings loaded:', uniqueBookings.length);
      setBookings(uniqueBookings);

    } catch (error: any) {
      console.error("Error fetching bookings:", error);
      const errorMessage = error.message || "Errore nel caricamento delle prenotazioni";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [authState.user, authState.profile?.role]);

  useEffect(() => {
    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Se non c'è utente, resetta lo stato
    if (!authState.user) {
      setBookings([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Se il profilo non è ancora caricato, aspetta
    if (authState.isLoading) {
      return;
    }

    // Debounce the fetch call
    debounceTimeoutRef.current = setTimeout(() => {
      fetchBookings();
    }, 500);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [fetchBookings, authState.isLoading]);

  return { 
    bookings, 
    setBookings, 
    isLoading,
    error,
    refetch: fetchBookings
  };
};
