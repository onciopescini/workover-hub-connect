import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/booking";
import { toast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";
import { sreLogger } from '@/lib/sre-logger';

// Helper function to safely convert Json array to string array
const jsonArrayToStringArray = (jsonArray: Json[] | Json | null): string[] => {
  if (!jsonArray) return [];
  
  if (Array.isArray(jsonArray)) {
    return jsonArray.filter((item): item is string => typeof item === 'string');
  }
  
  return [];
};

// Fetch messages for a specific booking
export const fetchBookingMessages = async (bookingId: string): Promise<Message[]> => {
  try {
    // Prima prendiamo i messaggi
    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select(`
        id,
        booking_id,
        sender_id,
        content,
        attachments,
        is_read,
        created_at
      `)
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      sreLogger.error('Error fetching messages', { 
        context: 'fetchBookingMessages',
        bookingId 
      }, messagesError as Error);
      throw messagesError;
    }

    if (!messagesData || messagesData.length === 0) {
      return [];
    }

    // Prendiamo gli ID dei sender
    const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];
    
    // Prendiamo i profili dei sender
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, profile_photo_url")
      .in("id", senderIds);

    if (profilesError) {
      sreLogger.error('Error fetching profiles', { 
        context: 'fetchBookingMessages',
        bookingId,
        senderIds 
      }, profilesError as Error);
      // Non lanciamo errore qui, continuiamo senza i profili
    }

    // Combiniamo i dati con conversione sicura degli attachments  
    const messages: Message[] = messagesData.map(msg => {
      const message: Message = {
        id: msg.id,
        booking_id: msg.booking_id,
        sender_id: msg.sender_id,
        content: msg.content,
        attachments: jsonArrayToStringArray(msg.attachments),
        is_read: msg.is_read ?? false,
        created_at: msg.created_at ?? ''
      };
      
      const senderProfile = profilesData?.find(profile => profile.id === msg.sender_id);
      if (senderProfile) {
        message.sender = senderProfile;
      }
      
      return message;
    });
    
    return messages;
  } catch (error) {
    sreLogger.error('Error in fetchBookingMessages', { 
      context: 'fetchBookingMessages',
      bookingId 
    }, error as Error);
    return [];
  }
};

// Send a new message
export const sendBookingMessage = async (
  bookingId: string, 
  content: string,
  attachments: string[] = []
): Promise<Message | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error("User not authenticated");
    }
    
    const { data, error } = await supabase
      .from("messages")
      .insert({
        booking_id: bookingId,
        sender_id: user.user.id,
        content,
        attachments: attachments as Json[]
      })
      .select(`
        id,
        booking_id,
        sender_id,
        content,
        attachments,
        is_read,
        created_at
      `)
      .single();
    
    if (error) {
      sreLogger.error('Error sending message', { 
        context: 'sendBookingMessage',
        bookingId 
      }, error as Error);
      throw error;
    }

    // Prendi il profilo del sender
    const { data: senderProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, profile_photo_url")
      .eq("id", user.user.id)
      .single();

    if (profileError) {
      sreLogger.error('Error fetching sender profile', { 
        context: 'sendBookingMessage',
        bookingId,
        userId: user.user.id 
      }, profileError as Error);
    }
    
    const message: Message = {
      id: data.id,
      booking_id: data.booking_id,
      sender_id: data.sender_id,
      content: data.content,
      attachments: jsonArrayToStringArray(data.attachments),
      is_read: data.is_read ?? false,
      created_at: data.created_at ?? ''
    };
    
    if (senderProfile) {
      message.sender = senderProfile;
    }
    
    return message;
  } catch (error) {
    sreLogger.error('Error in sendBookingMessage', { 
      context: 'sendBookingMessage',
      bookingId 
    }, error as Error);
    toast({
      title: "Errore nell'invio del messaggio",
      description: "Riprova più tardi",
      variant: "destructive"
    });
    return null;
  }
};

// Upload an attachment for a message
export const uploadMessageAttachment = async (file: File): Promise<string | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error("User not authenticated");
    }
    
    // Create a unique file name with timestamp to avoid collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${user.user.id}/${fileName}`;
    
    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("message_attachments")
      .upload(filePath, file);
      
    if (uploadError) {
      sreLogger.error('Upload error', { 
        context: 'uploadMessageAttachment',
        fileName: file.name,
        fileSize: file.size,
        userId: user.user.id 
      }, uploadError as Error);
      throw uploadError;
    }
    
    // Get the public URL of the uploaded file
    const { data } = supabase.storage
      .from("message_attachments")
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  } catch (error) {
    sreLogger.error('Error in uploadMessageAttachment', { 
      context: 'uploadMessageAttachment',
      fileName: file.name 
    }, error as Error);
    toast({
      title: "Errore nell'upload del file",
      description: "Riprova con un file più piccolo o formato diverso",
      variant: "destructive"
    });
    return null;
  }
};

// Mark a message as read
export const markMessageAsRead = async (messageId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("id", messageId);
      
    if (error) {
      sreLogger.error('Error marking message as read', { 
        context: 'markMessageAsRead',
        messageId 
      }, error as Error);
      throw error;
    }
  } catch (error) {
    sreLogger.error('Error in markMessageAsRead', { 
      context: 'markMessageAsRead',
      messageId 
    }, error as Error);
  }
};
