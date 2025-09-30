import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  booking_id: string;
  created_at: string;
  is_read: boolean;
  attachments: string[];
  sender?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
}

export interface PrivateChat {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  created_at: string;
  last_message_at: string;
  participant_1?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
  participant_2?: {
    id: string;   
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
}

export interface PrivateMessage {
  id: string;
  content: string;
  sender_id: string;
  chat_id: string;
  created_at: string;
  is_read: boolean;
  attachments: string[];
}

export const fetchMessages = async (bookingId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id (
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) {
      sreLogger.error('Error fetching messages', { bookingId }, error as Error);
      throw error;
    }

    return data?.map(msg => {
      const message: Message = {
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        booking_id: msg.booking_id,
        created_at: msg.created_at ?? '',
        is_read: msg.is_read ?? false,
        attachments: Array.isArray(msg.attachments) ? msg.attachments as string[] : []
      };
      
      if (msg.sender) {
        message.sender = {
          first_name: msg.sender.first_name || '',
          last_name: msg.sender.last_name || '',
          profile_photo_url: msg.sender.profile_photo_url
        };
      }
      
      return message;
    }) || [];
  } catch (error) {
    sreLogger.error('Error in fetchMessages', { bookingId }, error as Error);
    return [];
  }
};

export const getUserPrivateChats = async (): Promise<PrivateChat[]> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from('private_chats')
      .select(`
        *,
        participant_1:profiles!participant_1_id (
          id,
          first_name,
          last_name,
          profile_photo_url
        ),
        participant_2:profiles!participant_2_id (
          id,
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .or(`participant_1_id.eq.${user.user.id},participant_2_id.eq.${user.user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      sreLogger.error('Error fetching private chats', { userId: user.user.id }, error as Error);
      throw error;
    }

    return data?.map(chat => ({
      ...chat,
      created_at: chat.created_at ?? '',
      last_message_at: chat.last_message_at ?? ''
    })) || [];
  } catch (error) {
    sreLogger.error('Error in getUserPrivateChats', {}, error as Error);
    return [];
  }
};

export const getPrivateMessages = async (chatId: string): Promise<PrivateMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('private_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      sreLogger.error('Error fetching private messages', { chatId }, error as Error);
      throw error;
    }

    return data?.map(msg => ({
      id: msg.id,
      content: msg.content,
      sender_id: msg.sender_id,
      chat_id: msg.chat_id,
      created_at: msg.created_at ?? '',
      is_read: msg.is_read ?? false,
      attachments: Array.isArray(msg.attachments) ? msg.attachments as string[] : []
    })) || [];
  } catch (error) {
    sreLogger.error('Error in getPrivateMessages', { chatId }, error as Error);
    return [];
  }
};

export const sendPrivateMessage = async (chatId: string, content: string): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from('private_messages')
      .insert({
        chat_id: chatId,
        content: content,
        sender_id: user.user.id,
      });

    if (error) {
      sreLogger.error('Error sending private message', { chatId, content }, error as Error);
      toast.error('Errore nell\'invio del messaggio');
      return false;
    }

    return true;
  } catch (error) {
    sreLogger.error('Error in sendPrivateMessage', { chatId }, error as Error);
    return false;
  }
};

export const sendMessage = async (bookingId: string, content: string): Promise<Message | null> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        content: content,
        sender_id: (await supabase.auth.getUser()).data.user?.id ?? '',
        booking_id: bookingId
      })
      .select()
      .single();

    if (error) {
      sreLogger.error('Error sending message', { bookingId, content }, error as Error);
      toast.error('Errore nell\'invio del messaggio');
      throw error;
    }

    return {
      id: data.id,
      content: data.content,
      sender_id: data.sender_id,
      booking_id: data.booking_id,
      created_at: data.created_at ?? '',
      is_read: data.is_read ?? false,
      attachments: Array.isArray(data.attachments) ? data.attachments as string[] : []
    };
  } catch (error) {
    sreLogger.error('Error in sendMessage', { bookingId }, error as Error);
    return null;
  }
};

export const uploadMessageAttachment = async (file: File): Promise<string | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error("User not authenticated");
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${user.user.id}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from("message_attachments")
      .upload(filePath, file);
      
    if (uploadError) {
      sreLogger.error("Upload error", { fileName: file.name, fileSize: file.size }, uploadError as Error);
      throw uploadError;
    }
    
    const { data } = supabase.storage
      .from("message_attachments")
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  } catch (error) {
    sreLogger.error("Error in uploadMessageAttachment", { fileName: file.name }, error as Error);
    toast.error('Errore nell\'upload del file');
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
      sreLogger.error('Error marking message as read', { messageId }, error as Error);
      return false;
    }

    return true;
  } catch (error) {
    sreLogger.error('Error in markMessageAsRead', { messageId }, error as Error);
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
      sreLogger.error('Error getting unread messages count', { userId }, error as Error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    sreLogger.error('Error in getUnreadMessagesCount', { userId }, error as Error);
    return 0;
  }
};
