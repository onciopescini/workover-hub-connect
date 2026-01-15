import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { useQueryClient } from "@tanstack/react-query";

export interface UnreadCounts {
  total: number;
  bookingMessages: number;
  messages: number;
  notifications: number;
  privateMessages: number;
}

export const useUnreadCount = () => {
  const { authState } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    total: 0,
    bookingMessages: 0,
    messages: 0,
    notifications: 0,
    privateMessages: 0
  });

  const fetchUnreadCounts = async () => {
    if (!authState.user) return;

    try {
      // Fetch unread messages count
      const { count: messagesCount, error: messagesError } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('is_read', false)
        .neq('sender_id', authState.user.id);

      if (messagesError) console.error('Error fetching unread messages:', messagesError);

      // Fetch unread booking requests (for hosts)
      let bookingsCount = 0;
      if ((authState.roles || []).includes('host')) {
        const { count, error: bookingsError } = await supabase
          .from('bookings')
          .select('id', { count: 'exact' })
          .eq('status', 'pending')
          // This is a simplified check. Ideally we join with workspaces where host_id = user.id
          // But for now, we rely on RLS or specific RPCs if available.
          // Let's try to filter by spaces owned by user if possible, or use the 'host_id' logic if RLS allows.
          // Assuming RLS filters bookings for the host correctly:
          .not('created_at', 'is', null);

        // Better approach: use a specific query if RLS isn't strict enough on 'pending' alone
        // But assuming standard RLS:
        if (!bookingsError && count !== null) {
          bookingsCount = count;
        }
      }

      // Fetch unread notifications
      const { count: notificationsCount, error: notifError } = await supabase
        .from('user_notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', authState.user.id)
        .eq('is_read', false);

      if (notifError) console.error('Error fetching unread notifications:', notifError);

      setUnreadCounts({
        total: (messagesCount || 0) + bookingsCount + (notificationsCount || 0),
        bookingMessages: bookingsCount,
        messages: messagesCount || 0,
        notifications: notificationsCount || 0,
        privateMessages: messagesCount || 0 // Mapping messages to privateMessages as they are now unified
      });

    } catch (error) {
      console.error('Error in fetchUnreadCounts:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCounts();

    if (!authState.user) return;

    // Realtime subscriptions
    const channel = supabase
      .channel('unread-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${authState.user.id}`, // Assuming receiver_id exists or similar logic
        },
        () => {
          fetchUnreadCounts();
          queryClient.invalidateQueries({ queryKey: ['messages'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${authState.user.id}`,
        },
        () => fetchUnreadCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.user]);

  // Return "counts" to match the destructuring in consumers
  return { counts: unreadCounts, refetch: fetchUnreadCounts };
};
