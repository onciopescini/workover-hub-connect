
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookingWithDetails, RawBookingData } from "@/types/booking";

export const useBookings = () => {
  const { authState } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!authState.user) return;

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

        if (coworkerError) {
          console.error('Coworker bookings error:', coworkerError);
          throw coworkerError;
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
            throw spacesError;
          }

          console.log('Spaces data:', spacesData);

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

        console.log('Processed coworker bookings:', coworkerBookings);

        // If user is a host, also fetch bookings for their spaces
        let hostBookings: BookingWithDetails[] = [];
        if (authState.profile?.role === "host" || authState.profile?.role === "admin") {
          // First get host's spaces
          const { data: userSpaces, error: spacesError } = await supabase
            .from("spaces")
            .select("id")
            .eq("host_id", authState.user.id);

          if (spacesError) {
            console.error('User spaces error:', spacesError);
            throw spacesError;
          }

          console.log('User spaces:', userSpaces);

          if (userSpaces && userSpaces.length > 0) {
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
              throw hostError;
            }

            console.log('Raw host bookings:', hostBookingsRaw);

            if (hostBookingsRaw && hostBookingsRaw.length > 0) {
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

              if (hostSpacesError) {
                console.error('Host spaces fetch error:', hostSpacesError);
                throw hostSpacesError;
              }

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

              if (coworkersError) {
                console.error('Coworkers fetch error:', coworkersError);
              }

              console.log('Coworkers data:', coworkersData);

              // Combine host booking data
              hostBookings = hostBookingsRaw.map(booking => ({
                ...booking,
                space: hostSpacesData?.find(space => space.id === booking.space_id) || {
                  id: booking.space_id,
                  title: 'Spazio non trovato',
                  address: '',
                  photos: [],
                  host_id: authState.user?.id || '',
                  price_per_day: 0
                },
                coworker: coworkersData?.find(coworker => coworker.id === booking.user_id) || null
              })) as BookingWithDetails[];
            }
          }
        }

        console.log('Processed host bookings:', hostBookings);

        // Combine all bookings and remove duplicates
        const allBookings = [...coworkerBookings, ...hostBookings];
        const uniqueBookings = allBookings.filter((booking, index, self) => 
          index === self.findIndex(b => b.id === booking.id)
        );

        console.log('All unique bookings:', uniqueBookings);

        setBookings(uniqueBookings);

      } catch (error) {
        console.error("Error fetching bookings:", error);
        toast.error("Errore nel caricamento delle prenotazioni");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [authState.user, authState.profile]);

  return { bookings, setBookings, isLoading };
};
