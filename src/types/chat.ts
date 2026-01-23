export interface ChatParticipant {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  avatar_url: string | null;
}

export interface Conversation {
  id: string;
  updated_at: string;
  participants: ChatParticipant[];
  last_message?: { content: string; created_at: string } | null;
  archived_at?: string | null;
  last_read_at?: string | null;
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
