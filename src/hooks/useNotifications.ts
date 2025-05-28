
import { useState, useEffect, useRef, useCallback } from "react";
import { UserNotification, NotificationCounts } from "@/types/notification";
import { getUserNotifications, getNotificationCounts } from "@/lib/notification-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useNotifications = () => {
  const { authState } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({ total: 0, unread: 0, byType: {} });
  const [isLoading, setIsLoading] = useState(true);
  
  // Anti-loop flags
  const isUpdatingRef = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const subscriptionRef = useRef<any>(null);

  // Debounced fetch function
  const debouncedFetch = useCallback(async () => {
    if (!authState.user || isUpdatingRef.current) return;
    
    isUpdatingRef.current = true;
    
    // Clear any existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    try {
      setIsLoading(true);
      const [notificationsData, countsData] = await Promise.all([
        getUserNotifications(50),
        getNotificationCounts()
      ]);
      
      setNotifications(notificationsData);
      setCounts(countsData);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Errore nel caricamento delle notifiche");
    } finally {
      setIsLoading(false);
      
      // Reset flag after delay to prevent rapid successive calls
      updateTimeoutRef.current = setTimeout(() => {
        isUpdatingRef.current = false;
      }, 1000);
    }
  }, [authState.user?.id]); // Only depend on user id

  useEffect(() => {
    debouncedFetch();
  }, [debouncedFetch]);

  // Real-time subscription with proper cleanup
  useEffect(() => {
    if (!authState.user) {
      // Clean up existing subscription
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      return;
    }

    console.log('🔔 Setting up notifications real-time subscription for user:', authState.user.id);

    const channel = supabase
      .channel(`user-notifications-${authState.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${authState.user.id}`
        },
        (payload) => {
          // Debounce real-time updates
          if (isUpdatingRef.current) return;
          
          console.log('🔔 Notification change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as UserNotification;
            
            setNotifications(prev => [newNotification, ...prev]);
            setCounts(prev => ({
              total: prev.total + 1,
              unread: prev.unread + 1,
              byType: {
                ...prev.byType,
                [newNotification.type]: (prev.byType[newNotification.type] || 0) + 1
              }
            }));
            
            // Show toast with rate limiting
            if (!isUpdatingRef.current) {
              toast.success(newNotification.title, {
                description: newNotification.content,
                duration: 5000,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as UserNotification;
            
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
            
            if (updatedNotification.is_read && payload.old && !payload.old.is_read) {
              setCounts(prev => ({
                ...prev,
                unread: Math.max(0, prev.unread - 1)
              }));
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            
            setNotifications(prev => prev.filter(n => n.id !== deletedId));
            
            if (!payload.old.is_read) {
              setCounts(prev => ({
                total: prev.total - 1,
                unread: Math.max(0, prev.unread - 1),
                byType: {
                  ...prev.byType,
                  [payload.old.type]: Math.max(0, (prev.byType[payload.old.type] || 0) - 1)
                }
              }));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Notifications subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('🔔 Cleaning up notifications subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [authState.user?.id]); // Only depend on user id

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setCounts(prev => ({ 
      ...prev, 
      unread: Math.max(0, prev.unread - 1) 
    }));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setCounts(prev => ({ ...prev, unread: 0 }));
  }, []);

  const fetchNotifications = useCallback(() => {
    debouncedFetch();
  }, [debouncedFetch]);

  return {
    notifications,
    counts,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };
};
