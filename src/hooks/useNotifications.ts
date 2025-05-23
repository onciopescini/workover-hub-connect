
import { useState, useEffect } from "react";
import { UserNotification, NotificationCounts } from "@/types/notification";
import { getUserNotifications, getNotificationCounts } from "@/lib/notification-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useNotifications = () => {
  const { authState } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({ total: 0, unread: 0, byType: {} });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!authState.user) {
      setNotifications([]);
      setCounts({ total: 0, unread: 0, byType: {} });
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const [notificationsData, countsData] = await Promise.all([
        getUserNotifications(50),
        getNotificationCounts()
      ]);
      
      setNotifications(notificationsData);
      setCounts(countsData);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [authState.user]);

  // Real-time subscription
  useEffect(() => {
    if (!authState.user) return;

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${authState.user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.user]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setCounts(prev => ({ 
      ...prev, 
      unread: Math.max(0, prev.unread - 1) 
    }));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setCounts(prev => ({ ...prev, unread: 0 }));
  };

  return {
    notifications,
    counts,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };
};
