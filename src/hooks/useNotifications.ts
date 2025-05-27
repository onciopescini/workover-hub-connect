
import { useState, useEffect } from "react";
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
      toast.error("Errore nel caricamento delle notifiche");
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

    console.log('🔔 Setting up notifications real-time subscription for user:', authState.user.id);

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
        (payload) => {
          console.log('🔔 Notification change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as UserNotification;
            
            // Aggiungi la nuova notifica in cima alla lista
            setNotifications(prev => [newNotification, ...prev]);
            
            // Aggiorna i contatori
            setCounts(prev => ({
              total: prev.total + 1,
              unread: prev.unread + 1,
              byType: {
                ...prev.byType,
                [newNotification.type]: (prev.byType[newNotification.type] || 0) + 1
              }
            }));
            
            // Mostra toast per nuova notifica
            toast.success(newNotification.title, {
              description: newNotification.content,
              duration: 5000,
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as UserNotification;
            
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
            
            // Se la notifica è stata marcata come letta, aggiorna i contatori
            if (updatedNotification.is_read && payload.old && !payload.old.is_read) {
              setCounts(prev => ({
                ...prev,
                unread: Math.max(0, prev.unread - 1)
              }));
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            
            setNotifications(prev => prev.filter(n => n.id !== deletedId));
            
            // Aggiorna i contatori
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

    return () => {
      console.log('🔔 Cleaning up notifications subscription');
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
