
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
  
  // Refs per prevenire fetch multipli simultanei e debouncing
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchBookings = useCallback(async () => {
    if (!authState.user) {
      setIsLoading(false);
      setBookings([]);
      setError(null);
      return;
    }

    // Prevenire fetch multipli simultanei con controllo più stringente
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }

    // Debouncing aggressivo - non fare fetch se l'ultimo è stato fatto meno di 5 secondi fa
    const now = Date.now();
    if (now - lastFetchRef.current < 5000) {
      console.log('Debouncing fetch request...');
      return;
    }

    // Cancella richieste precedenti se esistono
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    isFetchingRef.current = true;
    lastFetchRef.current = now;
    setError(null);

    // Crea nuovo AbortController per questa richiesta
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

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
        .order("booking_date", { ascending: false })
        .abortSignal(signal);

      if (signal.aborted) return;

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
          .in("id", spaceIds)
          .abortSignal(signal);

        if (signal.aborted) return;

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
            .eq("host_id", authState.user.id)
            .abortSignal(signal);

          if (signal.aborted) return;

          if (spacesError) {
            console.error('User spaces error:', spacesError);
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
              .neq("user_id", authState.user.id)
              .order("booking_date", { ascending: false })
              .abortSignal(signal);

            if (signal.aborted) return;

            if (hostError) {
              console.error('Host bookings error:', hostError);
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
                .in("id", spaceIds)
                .abortSignal(signal);

              if (signal.aborted) return;

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
                .in("id", coworkerIds)
                .abortSignal(signal);

              if (signal.aborted) return;

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

      if (signal.aborted) return;

      // Combine all bookings and remove duplicates
      const allBookings = [...coworkerBookings, ...hostBookings];
      const uniqueBookings = allBookings.filter((booking, index, self) => 
        index === self.findIndex(b => b.id === booking.id)
      );

      console.log('All unique bookings loaded:', uniqueBookings.length);
      setBookings(uniqueBookings);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Fetch was aborted');
        return;
      }
      
      console.error("Error fetching bookings:", error);
      const errorMessage = error.message || "Errore nel caricamento delle prenotazioni";
      setError(errorMessage);
      
      // Solo mostra toast se non è un errore di abort
      if (!error.message?.includes('aborted')) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
      abortControllerRef.current = null;
    }
  }, []); // Rimuoviamo completamente le dipendenze per evitare il loop

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

    // Se l'autenticazione è ancora in caricamento, aspetta
    if (authState.isLoading) {
      return;
    }

    // Solo se abbiamo un utente autenticato e il profilo è caricato
    if (authState.user && !authState.isLoading) {
      // Debounce più aggressivo
      debounceTimeoutRef.current = setTimeout(() => {
        fetchBookings();
      }, 1000);
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Cancella richieste pendenti quando il componente si smonta o cambia
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [authState.user?.id, authState.isLoading]); // Solo dipendenze essenziali

  return { 
    bookings, 
    setBookings, 
    isLoading,
    error,
    refetch: fetchBookings
  };
};
