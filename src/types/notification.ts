
export interface UserNotification {
  id: string;
  user_id: string;
  type: "message" | "booking" | "event" | "review" | "system" | "ticket" | "connection";
  title: string;
  content?: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationCounts {
  total: number;
  unread: number;
  byType: Record<string, number>;
}
