import { useState, useEffect, useCallback } from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

interface UnreadCounts {
  bookingMessages: number;
  total: number;
}

export const useUnreadCount = () => {
  const { authState } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({
    bookingMessages: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // STABILIZED: useCallback to prevent re-creation on every render
  const fetchUnreadCounts = useCallback(async () => {
    if (!authState.user?.id) {
      setCounts({ bookingMessages: 0, total: 0 });
      setIsLoading(false);
      return;
    }

    try {
      // Get unread messages where current user is the recipient (or not sender)
      // Since we don't have a direct 'recipient_id' column in the public.messages table shown in the types,
      // we usually rely on "sender_id != current_user".
      // However, to be precise, we should join conversations or ensure we are a participant.
      // For now, mirroring existing logic: count messages not sent by me.

      const { count: bookingCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', authState.user.id);

      const newCounts = {
        bookingMessages: bookingCount || 0,
        total: bookingCount || 0
      };

      setCounts(prev => {
        if (prev.bookingMessages === newCounts.bookingMessages && prev.total === newCounts.total) {
          return prev;
        }
        return newCounts;
      });
    } catch (error) {
      sreLogger.error("Error fetching unread counts", { userId: authState.user?.id }, error as Error);
      setCounts({ bookingMessages: 0, total: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [authState.user?.id]);

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

    return () => {
      supabase.removeChannel(bookingChannel);
    };
  }, [authState.user?.id, fetchUnreadCounts]);

  return {
    counts,
    isLoading,
    refetch: fetchUnreadCounts
  };
};
