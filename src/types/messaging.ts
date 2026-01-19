
export interface MessageAttachment {
  url: string;
  type: 'image' | 'file';
  name: string;
  size?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  booking_id?: string;
  attachments?: MessageAttachment[];
}

export interface Conversation {
  id: string;
  type: 'booking' | 'private' | 'group';
  title: string;
  subtitle: string;
  avatar?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  is_online?: boolean;
  status?: 'confirmed' | 'pending' | 'cancelled' | 'active';
  priority?: 'urgent' | 'high' | 'normal';
  host_id: string;
  coworker_id: string;
  other_user_id?: string; // ID of the other participant
  booking_id?: string;
  space?: {
    name: string;
  };
  booking?: {
    booking_date: string;
    status: string;
  };
}
