/**
 * Chat Service Layer
 * 
 * Handles all chat and messaging API calls with proper error handling
 * and type safety. Follows the established Service Layer Pattern.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';
import { 
  Conversation, 
  Message, 
  ChatParticipant
} from '@/types/chat';

// ============= TYPES =============

export interface FetchConversationsResult {
  success: boolean;
  conversations?: Conversation[];
  error?: string;
}

export interface FetchMessagesResult {
  success: boolean;
  messages?: Message[];
  error?: string;
}

export interface SendMessageParams {
  conversationId: string;
  senderId: string;
  content: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============= FETCH CONVERSATIONS =============

export async function fetchConversations(userId: string): Promise<FetchConversationsResult> {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  sreLogger.info('Fetching conversations', { component: 'chatService', userId });

  try {
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id,
        updated_at,
        last_message,
        last_message_at,
        booking_id,
        participant_status:conversation_participants!inner (
          user_id,
          archived_at,
          last_read_at
        ),
        conversation_participants:conversation_participants (
          user_id,
          archived_at,
          last_read_at,
          profiles (
            id,
            first_name,
            last_name,
            profile_photo_url
          )
        )
      `)
      .eq("participant_status.user_id", userId)
      .is("participant_status.archived_at", null)
      .order("updated_at", { ascending: false });

    if (error) {
      sreLogger.error('Error fetching conversations', { component: 'chatService' }, error);
      return { success: false, error: error.message };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conversations: Conversation[] = (data ?? []).map((conv: any) => ({
      id: conv.id,
      updated_at: conv.updated_at,
      participants: conv.conversation_participants.map((cp: any): ChatParticipant => ({
        id: cp.profiles.id,
        first_name: cp.profiles.first_name,
        last_name: cp.profiles.last_name,
        profile_photo_url: cp.profiles.profile_photo_url,
        avatar_url: cp.profiles.profile_photo_url || null,
      })),
      last_message: conv.last_message
        ? { content: conv.last_message, created_at: conv.last_message_at || conv.updated_at }
        : null,
      archived_at: conv.participant_status?.[0]?.archived_at ?? null,
      last_read_at: conv.participant_status?.[0]?.last_read_at ?? null,
    }));

    return { success: true, conversations };
  } catch (err) {
    sreLogger.error('Exception fetching conversations', { component: 'chatService' }, err as Error);
    return { success: false, error: 'Failed to fetch conversations' };
  }
}

// ============= FETCH MESSAGES =============

export async function fetchMessages(conversationId: string): Promise<FetchMessagesResult> {
  if (!conversationId) {
    return { success: false, error: 'Conversation ID is required' };
  }

  sreLogger.info('Fetching messages', { component: 'chatService', conversationId });

  try {
    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at, is_read")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      sreLogger.error('Error fetching messages', { component: 'chatService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true, messages: (data ?? []) as Message[] };
  } catch (err) {
    sreLogger.error('Exception fetching messages', { component: 'chatService' }, err as Error);
    return { success: false, error: 'Failed to fetch messages' };
  }
}

// ============= SEND MESSAGE =============

export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  const { conversationId, senderId, content } = params;

  if (!conversationId || !senderId || !content) {
    return { success: false, error: 'Missing required parameters' };
  }

  sreLogger.info('Sending message', { component: 'chatService', conversationId });

  try {
    // Get the booking_id from the conversation (may be null for networking chats)
    const { data: conversationData, error: convError } = await supabase
      .from("conversations")
      .select("booking_id")
      .eq("id", conversationId)
      .single();

    if (convError) {
      sreLogger.error('Error fetching conversation', { component: 'chatService' }, convError);
      return { success: false, error: 'Could not find conversation' };
    }

    // Get booking_id from conversation - can be null for networking conversations
    // Note: The TypeScript types require booking_id but the DB allows NULL
    // For networking conversations without booking_id, we skip including it
    const bookingId = conversationData?.booking_id;

    // Build the insert payload - omit booking_id if null to let DB handle it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertPayload: any = {
      conversation_id: conversationId,
      sender_id: senderId,
      content
    };
    
    if (bookingId) {
      insertPayload.booking_id = bookingId;
    }

    const { data: insertedMessage, error: insertError } = await supabase
      .from("messages")
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      sreLogger.error('Error inserting message', { component: 'chatService' }, insertError);
      return { success: false, error: insertError.message };
    }

    // Update conversation metadata
    await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
        last_message: content,
        last_message_at: new Date().toISOString()
      })
      .eq("id", conversationId);

    sreLogger.info('Message sent successfully', { component: 'chatService', messageId: insertedMessage.id });
    return { success: true, messageId: insertedMessage.id };
  } catch (err) {
    sreLogger.error('Exception sending message', { component: 'chatService' }, err as Error);
    return { success: false, error: 'Failed to send message' };
  }
}

// ============= DELETE MESSAGE =============

export async function deleteMessage(messageId: string): Promise<{ success: boolean; error?: string }> {
  if (!messageId) {
    return { success: false, error: 'Message ID is required' };
  }

  sreLogger.info('Deleting message', { component: 'chatService', messageId });

  try {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) {
      sreLogger.error('Error deleting message', { component: 'chatService' }, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    sreLogger.error('Exception deleting message', { component: 'chatService' }, err as Error);
    return { success: false, error: 'Failed to delete message' };
  }
}

// ============= ARCHIVE CONVERSATION =============

export async function archiveConversation(
  conversationId: string, 
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!conversationId || !userId) {
    return { success: false, error: 'Missing required parameters' };
  }

  sreLogger.info('Archiving conversation', { component: 'chatService', conversationId });

  try {
    const { error } = await supabase
      .from("conversation_participants")
      .update({ archived_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);

    if (error) {
      sreLogger.error('Error archiving conversation', { component: 'chatService' }, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    sreLogger.error('Exception archiving conversation', { component: 'chatService' }, err as Error);
    return { success: false, error: 'Failed to archive conversation' };
  }
}

// ============= MARK CONVERSATION UNREAD =============

export async function markConversationUnread(
  conversationId: string, 
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!conversationId || !userId) {
    return { success: false, error: 'Missing required parameters' };
  }

  sreLogger.info('Marking conversation unread', { component: 'chatService', conversationId });

  try {
    const { error } = await supabase
      .from("conversation_participants")
      .update({ last_read_at: null })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);

    if (error) {
      sreLogger.error('Error marking conversation unread', { component: 'chatService' }, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    sreLogger.error('Exception marking conversation unread', { component: 'chatService' }, err as Error);
    return { success: false, error: 'Failed to mark conversation unread' };
  }
}
