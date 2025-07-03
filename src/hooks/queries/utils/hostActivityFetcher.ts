
import { supabase } from "@/integrations/supabase/client";
import { RecentActivity } from "../types/hostDashboardTypes";

export const fetchHostRecentActivity = async (hostId: string): Promise<RecentActivity[]> => {
  const activities: RecentActivity[] = [];

  // Get recent bookings
  const { data: recentBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      spaces (title),
      profiles (first_name, last_name)
    `)
    .eq('spaces.host_id', hostId)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get recent messages
  const { data: recentMessages } = await supabase
    .from('messages')
    .select(`
      *,
      bookings!inner (
        spaces!inner (
          host_id,
          title
        )
      ),
      profiles (first_name, last_name)
    `)
    .eq('bookings.spaces.host_id', hostId)
    .neq('sender_id', hostId)
    .order('created_at', { ascending: false })
    .limit(3);

  // Add booking activities
  recentBookings?.forEach(booking => {
    activities.push({
      id: booking.id,
      type: 'booking',
      title: `Nuova prenotazione da ${booking.profiles?.first_name} ${booking.profiles?.last_name}`,
      description: `Prenotazione per ${booking.spaces?.title} - ${booking.booking_date}`,
      created_at: booking.created_at ?? '',
      metadata: { booking_id: booking.id, status: booking.status ?? 'pending' }
    });
  });

  // Add message activities
  recentMessages?.forEach(message => {
    activities.push({
      id: message.id,
      type: 'message',
      title: `Nuovo messaggio da ${message.profiles?.first_name} ${message.profiles?.last_name}`,
      description: message.content.substring(0, 100) + '...',
      created_at: message.created_at ?? '',
      metadata: { booking_id: message.booking_id }
    });
  });

  return activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
};
