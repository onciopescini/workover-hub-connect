
import { supabase } from "@/integrations/supabase/client";
import { RecentActivity } from "../types/hostDashboardTypes";
import { sreLogger } from '@/lib/sre-logger';

export const fetchHostRecentActivity = async (hostId: string): Promise<RecentActivity[]> => {
  const activities: RecentActivity[] = [];

  try {
    // 1. Fetch Host Workspaces first
    const { data: workspaces, error: wsError } = await (supabase
      .from('workspaces' as any)
      .select('id, name')
      .eq('host_id', hostId)) as any;

    if (wsError) throw wsError;

    if (!workspaces || workspaces.length === 0) return [];

    const workspaceIds = workspaces.map((ws: any) => ws.id);
    const workspaceMap = new Map(workspaces.map((ws: any) => [ws.id, ws.name]));

    // 2. Fetch Recent Bookings
    const { data: recentBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        created_at,
        status,
        space_id,
        user_id,
        profiles (first_name, last_name)
      `)
      .in('space_id', workspaceIds)
      .order('created_at', { ascending: false })
      .limit(5);

    if (bookingsError) throw bookingsError;

    // 3. Fetch Recent Messages
    // We fetch messages linked to the bookings of the host's spaces
    // Since we can't deep filter efficiently without the inner joins on spaces (which we can't do due to schema change)
    // We will query messages where booking_id is in the list of bookings for these workspaces.
    // However, fetching ALL booking IDs for the workspaces might be heavy if there are thousands.
    // OPTIMIZATION: We only care about RECENT messages.
    // We can try to fetch recent messages and filter by booking -> space_id match.
    // OR we fetch the recent bookings (limit 50?) and get messages for those? No, a new message might come for an old booking.

    // Alternative:
    // messages -> booking_id -> bookings -> space_id
    // Supabase allows filtering on joined resource columns if we join them.
    // messages.select('*, bookings!inner(space_id)').in('bookings.space_id', workspaceIds)

    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        sender_id,
        booking_id,
        bookings!inner (
          space_id
        ),
        profiles (first_name, last_name)
      `)
      .in('bookings.space_id', workspaceIds) // Filter messages where related booking is in host's workspaces
      .neq('sender_id', hostId) // Don't show messages sent by host
      .order('created_at', { ascending: false })
      .limit(3);

    if (messagesError) throw messagesError;

    // 4. Transform to RecentActivity
    recentBookings?.forEach((booking: any) => {
      // Type assertion for profiles array/object returned by Supabase
      const guestProfile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
      const guestName = guestProfile ? `${guestProfile.first_name || ''} ${guestProfile.last_name || ''}`.trim() : 'Ospite';
      const spaceTitle = workspaceMap.get(booking.space_id) || 'Spazio';

      activities.push({
        id: booking.id,
        type: 'booking',
        title: `Nuova prenotazione da ${guestName}`,
        description: `Prenotazione per ${spaceTitle} - ${booking.booking_date}`,
        created_at: booking.created_at ?? '',
        metadata: { booking_id: booking.id, status: booking.status ?? 'pending' }
      });
    });

    recentMessages?.forEach((message: any) => {
      const guestProfile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
      const guestName = guestProfile ? `${guestProfile.first_name || ''} ${guestProfile.last_name || ''}`.trim() : 'Utente';

      // Get space title from booking info
      // @ts-ignore - Supabase types might not infer the deep joined booking structure perfectly here
      const bookingSpaceId = message.bookings?.space_id;
      const spaceTitle = bookingSpaceId ? (workspaceMap.get(bookingSpaceId) || 'Spazio') : 'Spazio';

      activities.push({
        id: message.id,
        type: 'message',
        title: `Nuovo messaggio da ${guestName}`,
        description: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
        created_at: message.created_at ?? '',
        metadata: { booking_id: message.booking_id }
      });
    });

  } catch (error) {
    sreLogger.error('Error fetching recent activity', { hostId }, error as Error);
  }

  return activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
};
