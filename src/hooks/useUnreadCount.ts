import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { queryKeys } from "@/lib/react-query-config";
import { sreLogger } from "@/lib/sre-logger";

export interface UnreadCounts {
  total: number;
  bookingMessages: number;
  messages: number;
  notifications: number;
  privateMessages: number;
}

const defaultCounts: UnreadCounts = {
  total: 0,
  bookingMessages: 0,
  messages: 0,
  notifications: 0,
  privateMessages: 0
};

async function fetchUnreadCounts(userId: string, roles: string[]): Promise<UnreadCounts> {
  try {
    // Fetch unread messages count
    const { count: messagesCount, error: messagesError } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('is_read', false)
      .neq('sender_id', userId);

    if (messagesError) {
      sreLogger.error('Error fetching unread messages', { component: 'useUnreadCount' }, messagesError);
    }

    // Fetch unread booking requests (for hosts)
    let bookingsCount = 0;
    if (roles.includes('host')) {
      const { count, error: bookingsError } = await supabase
        .from('bookings')
        .select('id', { count: 'exact' })
        .eq('status', 'pending')
        .not('created_at', 'is', null);

      if (!bookingsError && count !== null) {
        bookingsCount = count;
      }
    }

    // Fetch unread notifications
    const { count: notificationsCount, error: notifError } = await supabase
      .from('user_notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (notifError) {
      sreLogger.error('Error fetching unread notifications', { component: 'useUnreadCount' }, notifError);
    }

    return {
      total: (messagesCount || 0) + bookingsCount + (notificationsCount || 0),
      bookingMessages: bookingsCount,
      messages: messagesCount || 0,
      notifications: notificationsCount || 0,
      privateMessages: messagesCount || 0
    };
  } catch (error) {
    sreLogger.error('Error in fetchUnreadCounts', { component: 'useUnreadCount' }, error instanceof Error ? error : undefined);
    return defaultCounts;
  }
}

export const useUnreadCount = () => {
  const { authState } = useAuth();
  const queryClient = useQueryClient();

  const { data: counts = defaultCounts, refetch } = useQuery({
    queryKey: queryKeys.messages.unreadCount(),
    queryFn: () => fetchUnreadCounts(authState.user!.id, authState.roles || []),
    enabled: !!authState.user?.id,
    staleTime: 30000, // 30 seconds - unread counts should be relatively fresh
    refetchOnWindowFocus: true,
  });

  // Realtime subscriptions for automatic updates
  useEffect(() => {
    if (!authState.user?.id) return;

    const channel = supabase
      .channel('unread-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${authState.user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.messages.unreadCount() });
          queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
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
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.messages.unreadCount() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.user?.id, queryClient]);

  return { counts, refetch };
};
