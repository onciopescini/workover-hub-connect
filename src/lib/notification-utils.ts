
import { supabase } from "@/integrations/supabase/client";
import { UserNotification, NotificationCounts } from "@/types/notification";
import { toast } from "sonner";

// Fetch user notifications
export const getUserNotifications = async (limit?: number): Promise<UserNotification[]> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return [];

    let query = supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
};

// Get notification counts
export const getNotificationCounts = async (): Promise<NotificationCounts> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return { total: 0, unread: 0, byType: {} };

    const { data, error } = await supabase
      .from('user_notifications')
      .select('type, is_read')
      .eq('user_id', user.user.id);

    if (error) throw error;

    const notifications = data || [];
    const total = notifications.length;
    const unread = notifications.filter(n => !n.is_read).length;
    const byType = notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, unread, byType };
  } catch (error) {
    console.error("Error fetching notification counts:", error);
    return { total: 0, unread: 0, byType: {} };
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('mark_notification_as_read', {
      notification_id: notificationId
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('mark_all_notifications_as_read');

    if (error) throw error;
    toast.success("Tutte le notifiche sono state marcate come lette");
    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    toast.error("Errore nel marcare le notifiche come lette");
    return false;
  }
};

// Create a manual notification (for system messages)
export const createNotification = async (
  userId: string,
  type: UserNotification['type'],
  title: string,
  content?: string,
  metadata?: Record<string, any>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        type,
        title,
        content,
        metadata: metadata || {}
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error creating notification:", error);
    return false;
  }
};
