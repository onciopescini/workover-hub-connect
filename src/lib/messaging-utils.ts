
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  booking_id: string;
  created_at: string;
  is_read: boolean;
  attachments?: any[];
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
}

export const fetchMessagesForBooking = async (bookingId: string): Promise<MessageWithSender[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    return data as MessageWithSender[];
  } catch (error) {
    console.error('Error in fetchMessagesForBooking:', error);
    throw error;
  }
};

export const sendMessage = async (bookingId: string, content: string): Promise<Message | null> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        booking_id: bookingId,
        content: content,
        sender_id: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Errore nell\'invio del messaggio');
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return null;
  }
};

export const markMessageAsRead = async (messageId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);

    if (error) {
      console.error('Error marking message as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markMessageAsRead:', error);
    return false;
  }
};

export const getUnreadMessagesCount = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread messages count:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error in getUnreadMessagesCount:', error);
    return 0;
  }
};
