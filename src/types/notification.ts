
export interface UserNotification {
  id: string;
  user_id: string;
  type: 'message' | 'booking' | 'event' | 'review' | 'system' | 'ticket';
  title: string;
  content: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationCounts {
  total: number;
  unread: number;
  byType: Record<string, number>;
}
