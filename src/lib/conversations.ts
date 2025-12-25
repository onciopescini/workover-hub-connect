import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

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
  
  if (error || !data) {
    sreLogger.error('getOrCreateConversation error', { params }, error as Error | undefined);
    throw new Error(error?.message || 'Unable to create conversation');
  }
  
  sreLogger.info('Created/found conversation', { conversationId: data });
  return data as string;
}

export async function sendMessageToConversation(params: {
  conversationId: string;
  bookingId?: string | null;
  content: string;
  senderId: string;
  recipientId?: string; // New optional parameter for safe fallback
}) {
  const { conversationId, bookingId, content, senderId, recipientId } = params;
  
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

  return data;
}

export async function fetchConversations(userId: string) {
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
      space:workspaces(id, name),
      booking:bookings(id, booking_date, status)
    `)
    .or(`host_id.eq.${userId},coworker_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(50);
    
  if (error) {
    sreLogger.error('fetchConversations error', { userId }, error as Error);
    // Return empty array instead of throwing to prevent 406 UI crashes if it's a transient network issue
    // though the user asked to fix the 406 specifically.
    // The 406 is usually a header mismatch. Supabase client handles headers.
    // If the error persists, it might be due to the shape of the return not matching the expectation?
    // But .select() returns [] on no match.
    // If it's a strictly 406 error, it's typically "Not Acceptable".
    // We will throw if it's a real error, but we've added the userId guard which was a suspected cause.
    throw new Error(error.message);
  }
  
  sreLogger.info('Found conversations', { userId, count: data?.length || 0 });
  return data || [];
}

export async function fetchConversationMessages(conversationId: string) {
  sreLogger.info('Fetching conversation messages', { conversationId });
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
    
  if (error) {
    sreLogger.error('fetchConversationMessages error', { conversationId }, error as Error);
    throw new Error(error.message);
  }
  
  sreLogger.info('Found messages', { conversationId, count: data?.length || 0 });
  return data || [];
}

export async function fetchUnreadCounts(userId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .eq('read', false)
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
  // Mark all messages in this conversation where receiver_id is userId as read
  // We don't have receiver_id on all messages explicitly if we only look at conversation context,
  // but messages usually have receiver_id.
  // Alternatively, we mark messages where sender_id != userId.

  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('read', false);

  if (error) {
    console.error("Error marking conversation as read:", error);
  }
}
