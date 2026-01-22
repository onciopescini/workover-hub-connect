import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';
import { Conversation, Message, MessageAttachment } from '@/types/messaging';

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
  
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_host_id: hostId,
    p_coworker_id: coworkerId,
    p_space_id: spaceId || null,
    p_booking_id: bookingId || null,
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
}): Promise<Message> {
  const { conversationId, bookingId, content, senderId, recipientId = "" } = params;
  
  sreLogger.info('Sending message', { conversationId, bookingId, senderId, recipientId });
  
  const messageData: any = {
    conversation_id: conversationId,
    content,
    sender_id: senderId,
  };
  
  // Only add booking_id if it's provided and not null
  if (bookingId) {
    messageData.booking_id = bookingId;
  }
  
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

  // Cast to Message type, ensuring compatibility
  return {
    id: data.id,
    conversation_id: data.conversation_id || conversationId,
    sender_id: data.sender_id,
    content: data.content,
    created_at: data.created_at || new Date().toISOString(),
    is_read: data.is_read || false,
    booking_id: data.booking_id,
    attachments: (data.attachments as any[]) || []
  };
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
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
      space:spaces(id, name, address, city, price_per_hour, photos),
      booking:bookings(id, booking_date, status, start_time, end_time)
    `)
    .or(`host_id.eq.${userId},coworker_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(50);
    
  if (error) {
    sreLogger.error('fetchConversations error', { userId }, error as Error);
    throw new Error(error.message);
  }
  
  sreLogger.info('Found conversations', { userId, count: data?.length || 0 });

  // Map to new Conversation type
  return (data || []).map((c: any) => {
    // Determine the "other" person
    const isHost = c.host_id === userId;
    const otherPerson = isHost ? c.coworker : c.host;

    return {
      id: c.id,
      type: c.booking_id ? 'booking' : 'private',
      title: otherPerson ? `${otherPerson.first_name} ${otherPerson.last_name}` : 'Utente Sconosciuto',
      subtitle: c.space?.name || (c.booking_id ? "Prenotazione" : "Networking"),
      avatar: otherPerson?.profile_photo_url,
      last_message: c.last_message || "",
      last_message_at: c.last_message_at,
      status: c.booking?.status as any,
      host_id: c.host_id,
      coworker_id: c.coworker_id,
      other_user_id: otherPerson?.id,
      booking_id: c.booking_id,
      space: c.space ? { name: c.space.name } : undefined,
      booking: c.booking ? {
        booking_date: c.booking.booking_date,
        status: c.booking.status
      } : undefined
    };
  });
}

export async function fetchConversationMessages(conversationId: string): Promise<Message[]> {
  sreLogger.info('Fetching conversation messages', { conversationId });
  
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at, is_read, booking_id, attachments')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
    
  if (error) {
    sreLogger.error('fetchConversationMessages error', { conversationId }, error as Error);
    throw new Error(error.message);
  }
  
  sreLogger.info('Found messages', { conversationId, count: data?.length || 0 });

  return (data || []).map((m: any) => ({
    id: m.id,
    conversation_id: m.conversation_id,
    sender_id: m.sender_id,
    content: m.content,
    created_at: m.created_at,
    is_read: m.is_read || false,
    booking_id: m.booking_id,
    attachments: (m.attachments as MessageAttachment[]) || []
  }));
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
