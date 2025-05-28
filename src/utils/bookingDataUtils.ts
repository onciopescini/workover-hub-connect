
import { supabase } from "@/integrations/supabase/client";
import { BookingWithDetails, RawBookingData } from "@/types/booking";

export const fetchCoworkerBookings = async (
  userId: string, 
  signal: AbortSignal
): Promise<BookingWithDetails[]> => {
  console.log('Fetching bookings for user:', userId);

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
    .eq("user_id", userId)
    .order("booking_date", { ascending: false })
    .abortSignal(signal);

  if (signal.aborted) throw new Error('Request aborted');

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

    if (signal.aborted) throw new Error('Request aborted');

    if (spacesError) {
      console.error('Spaces fetch error:', spacesError);
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

  return coworkerBookings;
};

export const fetchHostBookings = async (
  userId: string,
  signal: AbortSignal
): Promise<BookingWithDetails[]> => {
  try {
    // First get host's spaces
    const { data: userSpaces, error: spacesError } = await supabase
      .from("spaces")
      .select("id")
      .eq("host_id", userId)
      .abortSignal(signal);

    if (signal.aborted) throw new Error('Request aborted');

    if (spacesError) {
      console.error('User spaces error:', spacesError);
      console.warn('Failed to load host spaces, skipping host bookings');
      return [];
    }

    if (!userSpaces || userSpaces.length === 0) {
      return [];
    }

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
      .neq("user_id", userId)
      .order("booking_date", { ascending: false })
      .abortSignal(signal);

    if (signal.aborted) throw new Error('Request aborted');

    if (hostError) {
      console.error('Host bookings error:', hostError);
      console.warn('Failed to load host bookings, using only coworker bookings');
      return [];
    }

    if (!hostBookingsRaw || hostBookingsRaw.length === 0) {
      return [];
    }

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

    if (signal.aborted) throw new Error('Request aborted');

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

    if (signal.aborted) throw new Error('Request aborted');

    if (hostSpacesError || coworkersError) {
      console.warn('Failed to load complete host booking details, using fallback data');
    }

    // Combine host booking data
    const hostBookings = hostBookingsRaw.map(booking => ({
      ...booking,
      space: hostSpacesData?.find(space => space.id === booking.space_id) || {
        id: booking.space_id,
        title: 'Spazio non disponibile',
        address: '',
        photos: [],
        host_id: userId,
        price_per_day: 0
      },
      coworker: coworkersData?.find(coworker => coworker.id === booking.user_id) || null
    })) as BookingWithDetails[];

    return hostBookings;
  } catch (hostError) {
    console.error('Error fetching host bookings:', hostError);
    return [];
  }
};

export const combineAndDeduplicateBookings = (
  coworkerBookings: BookingWithDetails[],
  hostBookings: BookingWithDetails[]
): BookingWithDetails[] => {
  const allBookings = [...coworkerBookings, ...hostBookings];
  const uniqueBookings = allBookings.filter((booking, index, self) => 
    index === self.findIndex(b => b.id === booking.id)
  );
  
  console.log('All unique bookings loaded:', uniqueBookings.length);
  return uniqueBookings;
};
