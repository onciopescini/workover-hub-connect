import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

export async function getOrCreateConversation(params: {
  hostId: string;
  coworkerId: string;
  spaceId?: string | null;
  bookingId?: string | null;
}): Promise<string> {
  const { hostId, coworkerId, spaceId, bookingId } = params;
  
  sreLogger.info('Creating conversation', { hostId, coworkerId, spaceId, bookingId });
  
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_host_id: hostId,
    p_coworker_id: coworkerId,
    p_space_id: spaceId || '',
    p_booking_id: bookingId || '',
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
}) {
  const { conversationId, bookingId, content, senderId } = params;
  
  sreLogger.info('Sending message', { conversationId, bookingId, senderId });
  
  const messageData: any = {
    conversation_id: conversationId,
    content,
    sender_id: senderId,
  };
  
  // Only add booking_id if it's provided and not null
  if (bookingId) {
    messageData.booking_id = bookingId;
  }
  
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
  return data;
}

export async function fetchConversations(userId: string) {
  sreLogger.info('Fetching conversations', { userId });
  
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      host:profiles!conversations_host_id_fkey(id, first_name, last_name, profile_photo_url),
      coworker:profiles!conversations_coworker_id_fkey(id, first_name, last_name, profile_photo_url),
      space:spaces(id, title),
      booking:bookings(id, booking_date)
    `)
    .or(`host_id.eq.${userId},coworker_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(50);
    
  if (error) {
    sreLogger.error('fetchConversations error', { userId }, error as Error);
    throw new Error(error.message);
  }
  
  sreLogger.info('Found conversations', { userId, count: data?.length || 0 });
  return data || [];
}

export async function fetchConversationMessages(conversationId: string) {
  sreLogger.info('Fetching conversation messages', { conversationId });
  
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles(id, first_name, last_name, profile_photo_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
    
  if (error) {
    sreLogger.error('fetchConversationMessages error', { conversationId }, error as Error);
    throw new Error(error.message);
  }
  
  sreLogger.info('Found messages', { conversationId, count: data?.length || 0 });
  return data || [];
}