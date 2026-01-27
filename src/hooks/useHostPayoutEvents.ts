import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/react-query-config';
import { HostPayoutEvent } from '@/types/host-payout-events';

interface HostSpaceLookup {
  id: string;
  title: string;
}

interface HostPayoutBookingRow {
  id: string;
  space_id: string;
  payout_scheduled_at: string | null;
  payout_completed_at: string | null;
  payout_stripe_transfer_id: string | null;
}

const fetchHostPayoutEvents = async (hostId: string): Promise<HostPayoutEvent[]> => {
  const { data: spaces, error: spacesError } = await supabase
    .from('spaces')
    .select('id, title')
    .eq('host_id', hostId);

  if (spacesError) {
    throw spacesError;
  }

  const hostSpaces = (spaces ?? []) as unknown as HostSpaceLookup[];

  if (hostSpaces.length === 0) {
    return [];
  }

  const spaceIds = hostSpaces.map((space) => space.id);

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, space_id, payout_scheduled_at, payout_completed_at, payout_stripe_transfer_id')
    .in('space_id', spaceIds)
    .or('payout_scheduled_at.not.is.null,payout_completed_at.not.is.null')
    .order('payout_scheduled_at', { ascending: false });

  if (bookingsError) {
    throw bookingsError;
  }

  const spaceMap = new Map(hostSpaces.map((space) => [space.id, space.title]));
  const payoutBookings = (bookings ?? []) as HostPayoutBookingRow[];

  const events = payoutBookings.map<HostPayoutEvent>((booking) => {
    const scheduledAt = booking.payout_scheduled_at ?? null;
    const completedAt = booking.payout_completed_at ?? null;
    const status = completedAt ? 'completed' : 'scheduled';
    const eventDate = completedAt ?? scheduledAt ?? new Date().toISOString();

    return {
      id: booking.id,
      bookingId: booking.id,
      spaceId: booking.space_id,
      spaceTitle: spaceMap.get(booking.space_id) ?? 'Spazio sconosciuto',
      status,
      scheduledAt,
      completedAt,
      payoutTransferId: booking.payout_stripe_transfer_id ?? null,
      eventDate,
    };
  });

  return events.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
};

export const useHostPayoutEvents = (hostId: string | null): UseQueryResult<HostPayoutEvent[], Error> => {
  return useQuery<HostPayoutEvent[], Error>({
    queryKey: queryKeys.hostPayoutEvents.list(hostId ?? undefined),
    queryFn: () => {
      if (!hostId) {
        return Promise.resolve([]);
      }
      return fetchHostPayoutEvents(hostId);
    },
    enabled: !!hostId,
  });
};
