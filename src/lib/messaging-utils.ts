
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/booking";

export async function fetchMessages(bookingId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles(first_name, last_name, profile_photo_url)
    `)
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // Transform data to match Message type
  return (data || []).map((msg: any) => ({
    id: msg.id,
    booking_id: msg.booking_id,
    sender_id: msg.sender_id,
    content: msg.content,
    attachments: msg.attachments || [], // Assuming column exists or is handled
    is_read: msg.is_read || false,
    created_at: msg.created_at,
    sender: msg.sender // PostgREST result
  })) as Message[];
}

export async function sendMessage(bookingId: string, content: string): Promise<void> {
  // Retrieve current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // To maintain compatibility with new unified messaging, we should ideally fetch or create a conversation.
  // However, for this simple utility, we insert with booking_id and let the backend trigger handle conversation creation/lookup if possible.
  // BUT: The trigger 'handle_new_message_notification_v2' depends on conversation_id or booking_id lookup.

  // Let's try to get a conversation_id first if possible.
  const { data: convData } = await supabase
     .from('conversations')
     .select('id')
     .eq('booking_id', bookingId)
     .single();

  const payload: any = {
    booking_id: bookingId,
    content: content,
    sender_id: user.id,
    attachments: [] // Initialize empty
  };

  if (convData) {
    payload.conversation_id = convData.id;
  }

  const { error } = await supabase
    .from('messages')
    .insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadMessageAttachment(file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `chat-attachments/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments') // Ensure this bucket exists
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    return null;
  }

  const { data } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('id', messageId);

  if (error) {
    console.error('Error marking message as read', error);
  }
}
