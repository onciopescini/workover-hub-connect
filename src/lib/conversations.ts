import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';
import { MessageAttachment } from '@/types/chat';
import type { Database } from '@/integrations/supabase/types';
import type { ConversationJoin, MessageWithSenderJoin } from '@/types/supabase-joins';

// Local type for this file's fetchConversations return (legacy format)
interface LegacyConversation {
  id: string;
  type: 'booking' | 'private';
  title: string;
  subtitle: string;
  avatar?: string;
  last_message?: string;
  last_message_at?: string;
  status?: 'confirmed' | 'pending' | 'cancelled' | 'active';
  other_user_id?: string;
  host_id: string;
  coworker_id: string;
  booking_id?: string;
  space?: { name: string };
  booking?: { booking_date: string; status: string };
}

// Local message type
interface LegacyMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  booking_id?: string;
  attachments?: MessageAttachment[];
}

export async function getOrCreateConversation(params: {
  hostId: string;
  coworkerId: string;
  spaceId?: string | null;
  bookingId?: string | null;
}): Promise<string> {
  const { hostId, coworkerId, spaceId, bookingId } = params;

  if (!hostId || !coworkerId) {
    const errorMsg = 'Missing required parameters for conversation creation';
    sreLogger.error(errorMsg, { hostId, coworkerId });
    throw new Error(errorMsg);
  }
  
  sreLogger.info('Creating conversation', { hostId, coworkerId, spaceId, bookingId });
  
  // AGGRESSIVE FIX: Cast the entire params to any for RPC compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_or_create_conversation', {
    p_host_id: hostId,
    p_coworker_id: coworkerId,
    p_space_id: spaceId ?? null,
    p_booking_id: bookingId ?? null,
  });
  
  if (error) {
    sreLogger.error('getOrCreateConversation error', { params }, error as Error | undefined);
    throw new Error(error?.message || 'Unable to create conversation');
  }
  
  if (!data) {
    throw new Error('Unable to create conversation: no ID returned');
  }
  
  sreLogger.info('Created/found conversation', { conversationId: data });
  return data as string;
}

export async function sendMessageToConversation(params: {
  conversationId: string;
  bookingId?: string | null;
  content: string;
  senderId: string;
  recipientId?: string | undefined; // Allow undefined explicitly
}): Promise<LegacyMessage> {
  const { conversationId, bookingId, content, senderId, recipientId = "" } = params;
  
  sreLogger.info('Sending message', { conversationId, bookingId, senderId, recipientId });
  
  type MessageInsertInput = Database['public']['Tables']['messages']['Insert'];

  // Build the message data with required fields - booking_id is required in DB schema
  const messageData: MessageInsertInput = {
    conversation_id: conversationId,
    content,
    sender_id: senderId,
    booking_id: bookingId || '' // Required by schema, use empty string if not provided
  };
  
  // Step 1: Insert Message
  const { data, error } = await supabase
    .from('messages')
    .insert(messageData)
    .select()
    .single();

  if (error) {
    sreLogger.error('sendMessageToConversation error', { conversationId }, error as Error);
    throw new Error(error.message);
  }
  
  sreLogger.info('Message sent', { messageId: data.id });

  // Step 2: Safe Notification Fallback
  if (recipientId) {
    try {
      const { error: notifError } = await supabase
        .from('user_notifications')
        .insert({
          user_id: recipientId,
          type: 'message',
          title: 'Nuovo Messaggio',
          content: 'Hai ricevuto un nuovo messaggio nella tua prenotazione.',
          metadata: {
            conversation_id: conversationId,
            message_id: data.id,
            booking_id: bookingId || null
          }
        });

      if (notifError) {
        console.warn('Fallback notification failed (non-blocking):', notifError.message);
      } else {
        sreLogger.info('Fallback notification sent', { recipientId });
      }
    } catch (err) {
      console.warn('Fallback notification exception (non-blocking):', err);
    }
  }

  // Cast to LegacyMessage type, ensuring compatibility with proper type coercion
  const attachments = Array.isArray(data.attachments) 
    ? (data.attachments as unknown as MessageAttachment[]) 
    : [];

  const result: LegacyMessage = {
    id: data.id,
    conversation_id: data.conversation_id || conversationId,
    sender_id: data.sender_id,
    content: data.content,
    created_at: data.created_at || new Date().toISOString(),
    is_read: data.is_read || false,
    attachments
  };
  
  // Only add booking_id if it exists
  if (data.booking_id) {
    result.booking_id = data.booking_id;
  }
  
  return result;
}

export async function fetchConversations(userId: string): Promise<LegacyConversation[]> {
  sreLogger.info('Fetching conversations', { userId });
  
  if (!userId) {
    console.warn('fetchConversations called with empty userId');
    return [];
  }

  // Using explicit foreign key relationships and correct table names
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      host:profiles!conversations_host_id_fkey(id, first_name, last_name, profile_photo_url),
      coworker:profiles!conversations_coworker_id_fkey(id, first_name, last_name, profile_photo_url),
      space:spaces(id, title, address, city_name, price_per_hour, photos),
      booking:bookings(id, booking_date, status, start_time, end_time)
    `)
    .or(`host_id.eq.${userId},coworker_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(50)
    .overrideTypes<ConversationJoin[]>();
    
  if (error) {
    sreLogger.error('fetchConversations error', { userId }, error as Error);
    throw new Error(error.message);
  }
  
  sreLogger.info('Found conversations', { userId, count: data?.length || 0 });

  // Map to new LegacyConversation type
  const conversations = data || [];
  const validStatuses = new Set<LegacyConversation['status']>(['confirmed', 'pending', 'cancelled', 'active']);

  return conversations.map((c): LegacyConversation => {
    // Determine the "other" person
    const isHost = c.host_id === userId;
    const otherPerson = isHost ? c.coworker : c.host;
    const bookingStatus = c.booking?.status && validStatuses.has(c.booking.status as LegacyConversation['status'])
      ? (c.booking.status as LegacyConversation['status'])
      : undefined;

    const result: LegacyConversation = {
      id: c.id,
      type: c.booking_id ? 'booking' : 'private',
      title: otherPerson ? `${otherPerson.first_name} ${otherPerson.last_name}` : 'Utente Sconosciuto',
      subtitle: c.space?.title || (c.booking_id ? "Prenotazione" : "Networking"),
      last_message: c.last_message || "",
      host_id: c.host_id,
      coworker_id: c.coworker_id
    };
    
    // Add optional fields only if they have values
    if (otherPerson?.profile_photo_url) {
      result.avatar = otherPerson.profile_photo_url;
    }
    if (c.last_message_at) {
      result.last_message_at = c.last_message_at;
    }
    if (bookingStatus) {
      result.status = bookingStatus;
    }
    if (otherPerson?.id) {
      result.other_user_id = otherPerson.id;
    }
    if (c.booking_id) {
      result.booking_id = c.booking_id;
    }
    if (c.space) {
      result.space = { name: c.space.title };
    }
    if (c.booking) {
      result.booking = {
        booking_date: c.booking.booking_date || '',
        status: c.booking.status || 'pending'
      };
    }
    
    return result;
  });
}

export async function fetchConversationMessages(conversationId: string): Promise<LegacyMessage[]> {
  sreLogger.info('Fetching conversation messages', { conversationId });
  
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at, is_read, booking_id, attachments')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .overrideTypes<MessageWithSenderJoin[]>();
    
  if (error) {
    sreLogger.error('fetchConversationMessages error', { conversationId }, error as Error);
    throw new Error(error.message);
  }
  
  sreLogger.info('Found messages', { conversationId, count: data?.length || 0 });

  const messages = data || [];

  return messages.map((m): LegacyMessage => {
    const result: LegacyMessage = {
      id: m.id,
      conversation_id: m.conversation_id || conversationId, // Use provided ID if null
      sender_id: m.sender_id,
      content: m.content,
      created_at: m.created_at || new Date().toISOString(), // Default if null
      is_read: m.is_read || false,
      attachments: Array.isArray(m.attachments) ? (m.attachments as unknown as MessageAttachment[]) : []
    };
    
    // Only add booking_id if it exists
    if (m.booking_id) {
      result.booking_id = m.booking_id;
    }
    
    return result;
  });
}

export async function fetchUnreadCounts(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .eq('is_read', false) // Using is_read
    .neq('sender_id', userId);

  if (error) {
    console.error('Error fetching unread counts:', error);
    return {};
  }

  // Group by conversation_id
  const counts: Record<string, number> = {};
  data.forEach((msg) => {
    if (msg.conversation_id) {
      counts[msg.conversation_id] = (counts[msg.conversation_id] || 0) + 1;
    }
  });

  return counts;
}

export async function markConversationAsRead(conversationId: string, userId: string) {
  // Use RPC for marking as read
  const { error } = await supabase.rpc('mark_messages_read', {
    p_conversation_id: conversationId
  });

  if (error) {
    console.error("Error marking conversation as read:", error);
  }
}
