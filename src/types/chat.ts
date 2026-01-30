export interface ChatParticipant {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string | null;
  profile_photo_url: string | null;
  avatar_url: string | null;
}

export interface BookingContext {
  id: string;
  booking_date: string;
  status: string;
  start_time?: string | null;
  end_time?: string | null;
}

export interface SpaceContext {
  id: string;
  title: string;
  address?: string | null;
  city_name?: string | null;
  price_per_hour?: number | null;
  photos?: string[] | null;
}

export type ConversationType = 'booking' | 'private' | 'networking';

export interface Conversation {
  id: string;
  updated_at: string;
  participants: ChatParticipant[];
  last_message?: { content: string; created_at: string } | null;
  archived_at?: string | null;
  last_read_at?: string | null;
  // Context data for rich UI
  type?: ConversationType;
  booking_id?: string | null;
  space_id?: string | null;
  booking?: BookingContext | null;
  space?: SpaceContext | null;
  host_id?: string;
  coworker_id?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface DeleteMessagePayload {
  messageId: string;
  conversationId: string;
}

export interface ArchiveConversationPayload {
  conversationId: string;
}

export interface MarkConversationUnreadPayload {
  conversationId: string;
}

export interface SharedHistoryItem {
  space_title: string;
  booking_date: string;
}
