
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserNotification, NotificationCounts } from '@/types/notification';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/OptimizedAuthContext';

export const useNotifications = () => {
  const { authState } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({
    total: 0,
    unread: 0,
    byType: {},
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!authState.user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', authState.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        toast.error('Failed to load notifications');
        return;
      }

      // Transform the data to match our type
      const transformedData: UserNotification[] = data?.map(notification => ({
        ...notification,
        type: notification.type as UserNotification['type'],
        metadata: notification.metadata as Record<string, any>
      })) || [];

      setNotifications(transformedData);
      updateCounts(transformedData);
    } finally {
      setIsLoading(false);
    }
  }, [authState.user]);

  const updateCounts = (notifications: UserNotification[]) => {
    let total = notifications.length;
    let unread = notifications.filter(n => !n.is_read).length;
    let byType: { [key: string]: number } = {};

    notifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    setCounts({ total, unread, byType });
  };

  useEffect(() => {
    if (authState.user) {
      fetchNotifications();
    }
  }, [authState.user, fetchNotifications]);

  useEffect(() => {
    if (!authState.user) return;

    const channel = supabase
      .channel('user_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${authState.user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newNotification = {
              ...payload.new,
              type: payload.new.type as UserNotification['type'],
              metadata: payload.new.metadata as Record<string, any>
            } as UserNotification;
            
            setNotifications((prevNotifications) => {
              const exists = prevNotifications.some(n => n.id === newNotification.id);
              if (exists) {
                return prevNotifications.map(n => (n.id === newNotification.id ? newNotification : n));
              } else {
                return [newNotification, ...prevNotifications];
              }
            });
          } else if (payload.eventType === 'DELETE') {
            setNotifications((prevNotifications) =>
              prevNotifications.filter((n) => n.id !== payload.old?.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.user]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    setCounts(prev => ({
      ...prev,
      unread: prev.unread > 0 ? prev.unread - 1 : 0,
    }));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setCounts(prev => ({
      ...prev,
      unread: 0,
    }));
  }, []);

  return {
    notifications,
    counts,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
};
