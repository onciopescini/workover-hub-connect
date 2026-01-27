/**
 * Notification Service Layer
 * 
 * Handles all notification operations with proper error handling
 * and type safety. Follows the Result Pattern.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

// ============= TYPES =============

export type NotificationType = 
  | 'booking_confirmed' 
  | 'booking_cancelled' 
  | 'booking_reminder'
  | 'payment_received'
  | 'payment_failed'
  | 'message_received'
  | 'review_received'
  | 'system_alert'
  | 'conflict_detected';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string | null;
  is_read: boolean | null;
  created_at: string | null;
  metadata: Record<string, unknown> | null;
  priority: string;
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  priority?: string;
}

export interface CreateNotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

export interface GetNotificationsResult {
  success: boolean;
  notifications?: Notification[];
  error?: string;
}

export interface NotificationCounts {
  total: number;
  unread: number;
}

// ============= METHODS =============

/**
 * Create a new notification.
 */
export async function createNotification(params: CreateNotificationParams): Promise<CreateNotificationResult> {
  const { userId, type, title, content, metadata, priority } = params;

  if (!userId || !type || !title) {
    return { success: false, error: 'Missing required fields' };
  }

  sreLogger.info('Creating notification', { 
    component: 'notificationService', 
    userId, 
    type 
  });

  try {
    const { data, error } = await supabase
      .from('user_notifications')
      .insert([{
        user_id: userId,
        type,
        title,
        content: content || null,
        metadata: (metadata || {}) as unknown as Record<string, never>,
        priority: priority || 'normal',
        is_read: false
      }])
      .select('id')
      .single();

    if (error) {
      sreLogger.error('Error creating notification', { component: 'notificationService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true, notificationId: data.id };
  } catch (err) {
    sreLogger.error('Exception creating notification', { component: 'notificationService' }, err as Error);
    return { success: false, error: 'Failed to create notification' };
  }
}

/**
 * Get notifications for a user.
 */
export async function getNotifications(
  userId: string, 
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<GetNotificationsResult> {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  const limit = options?.limit ?? 50;
  const unreadOnly = options?.unreadOnly ?? false;

  sreLogger.info('Fetching notifications', { component: 'notificationService', userId });

  try {
    let query = supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      sreLogger.error('Error fetching notifications', { component: 'notificationService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true, notifications: data as Notification[] };
  } catch (err) {
    sreLogger.error('Exception fetching notifications', { component: 'notificationService' }, err as Error);
    return { success: false, error: 'Failed to fetch notifications' };
  }
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(
  notificationId: string, 
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!notificationId || !userId) {
    return { success: false, error: 'Notification ID and User ID are required' };
  }

  try {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      sreLogger.error('Error marking notification as read', { component: 'notificationService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    sreLogger.error('Exception marking notification as read', { component: 'notificationService' }, err as Error);
    return { success: false, error: 'Failed to mark notification as read' };
  }
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  sreLogger.info('Marking all notifications as read', { component: 'notificationService', userId });

  try {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      sreLogger.error('Error marking all notifications as read', { component: 'notificationService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    sreLogger.error('Exception marking all as read', { component: 'notificationService' }, err as Error);
    return { success: false, error: 'Failed to mark all as read' };
  }
}

/**
 * Get notification counts for a user.
 */
export async function getNotificationCounts(userId: string): Promise<{
  success: boolean;
  counts?: NotificationCounts;
  error?: string;
}> {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  try {
    const { count: total, error: totalError } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (totalError) {
      throw totalError;
    }

    const { count: unread, error: unreadError } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (unreadError) {
      throw unreadError;
    }

    return { 
      success: true, 
      counts: { 
        total: total || 0, 
        unread: unread || 0 
      } 
    };
  } catch (err) {
    sreLogger.error('Exception fetching notification counts', { component: 'notificationService' }, err as Error);
    return { success: false, error: 'Failed to fetch notification counts' };
  }
}

/**
 * Delete a notification.
 */
export async function deleteNotification(
  notificationId: string, 
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!notificationId || !userId) {
    return { success: false, error: 'Notification ID and User ID are required' };
  }

  try {
    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      sreLogger.error('Error deleting notification', { component: 'notificationService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    sreLogger.error('Exception deleting notification', { component: 'notificationService' }, err as Error);
    return { success: false, error: 'Failed to delete notification' };
  }
}
