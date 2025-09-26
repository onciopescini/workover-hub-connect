import { supabase } from '@/integrations/supabase/client';

export async function getOrCreateConversation(params: {
  hostId: string;
  coworkerId: string;
  spaceId?: string | null;
  bookingId?: string | null;
}): Promise<string> {
  const { hostId, coworkerId, spaceId, bookingId } = params;
  
  console.log('[getOrCreateConversation] Creating conversation with params:', params);
  
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_host_id: hostId,
    p_coworker_id: coworkerId,
    p_space_id: spaceId || '',
    p_booking_id: bookingId || '',
  });
  
  if (error || !data) {
    console.error('[getOrCreateConversation] error', error);
    throw new Error(error?.message || 'Unable to create conversation');
  }
  
  console.log('[getOrCreateConversation] Created/found conversation:', data);
  return data as string;
}

export async function sendMessageToConversation(params: {
  conversationId: string;
  bookingId?: string | null;
  content: string;
  senderId: string;
}) {
  const { conversationId, bookingId, content, senderId } = params;
  
  console.log('[sendMessageToConversation] Sending message with params:', params);
  
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
    console.error('[sendMessageToConversation] error', error);
    throw new Error(error.message);
  }
  
  console.log('[sendMessageToConversation] Message sent:', data);
  return data;
}

export async function fetchConversations(userId: string) {
  console.log('[fetchConversations] Fetching conversations for user:', userId);
  
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
    console.error('[fetchConversations] error', error);
    throw new Error(error.message);
  }
  
  console.log('[fetchConversations] Found conversations:', data?.length || 0);
  return data || [];
}

export async function fetchConversationMessages(conversationId: string) {
  console.log('[fetchConversationMessages] Fetching messages for conversation:', conversationId);
  
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles(id, first_name, last_name, profile_photo_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('[fetchConversationMessages] error', error);
    throw new Error(error.message);
  }
  
  console.log('[fetchConversationMessages] Found messages:', data?.length || 0);
  return data || [];
}