import { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

interface UnreadCounts {
  bookingMessages: number;
  privateMessages: number;
  total: number;
}

export const useUnreadCount = () => {
  const { authState } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({
    bookingMessages: 0,
    privateMessages: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnreadCounts = async () => {
    if (!authState.user?.id) {
      setCounts({ bookingMessages: 0, privateMessages: 0, total: 0 });
      setIsLoading(false);
      return;
    }

    try {
      // Get unread booking messages
      const { count: bookingCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', authState.user.id);

      // Get unread private messages
      const { count: privateCount } = await supabase
        .from('private_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', authState.user.id);

      const newCounts = {
        bookingMessages: bookingCount || 0,
        privateMessages: privateCount || 0,
        total: (bookingCount || 0) + (privateCount || 0)
      };

      setCounts(newCounts);
    } catch (error) {
      sreLogger.error("Error fetching unread counts", { userId: authState.user?.id }, error as Error);
      setCounts({ bookingMessages: 0, privateMessages: 0, total: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!authState.user?.id) return;

    fetchUnreadCounts();

    // Subscribe to booking messages changes
    const bookingChannel = supabase
      .channel('booking-messages-unread')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${authState.user.id}`
        },
        () => {
          fetchUnreadCounts();
        }
      )
      .subscribe();

    // Subscribe to private messages changes
    const privateChannel = supabase
      .channel('private-messages-unread')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_messages',
          filter: `sender_id=neq.${authState.user.id}`
        },
        () => {
          fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(privateChannel);
    };
  }, [authState.user?.id]);

  return {
    counts,
    isLoading,
    refetch: fetchUnreadCounts
  };
};