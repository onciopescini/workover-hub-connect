
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/booking";
import { toast } from "@/hooks/use-toast";

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
      console.error("Error fetching messages:", messagesError);
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
      console.error("Error fetching profiles:", profilesError);
      // Non lanciamo errore qui, continuiamo senza i profili
    }

    // Combiniamo i dati
    const messages: Message[] = messagesData.map(msg => ({
      id: msg.id,
      booking_id: msg.booking_id,
      sender_id: msg.sender_id,
      content: msg.content,
      attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
      is_read: msg.is_read,
      created_at: msg.created_at,
      sender: profilesData?.find(profile => profile.id === msg.sender_id) || undefined
    }));
    
    return messages;
  } catch (error) {
    console.error("Error in fetchBookingMessages:", error);
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
        attachments
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
      console.error("Error sending message:", error);
      throw error;
    }

    // Prendi il profilo del sender
    const { data: senderProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, profile_photo_url")
      .eq("id", user.user.id)
      .single();

    if (profileError) {
      console.error("Error fetching sender profile:", profileError);
    }
    
    return {
      id: data.id,
      booking_id: data.booking_id,
      sender_id: data.sender_id,
      content: data.content,
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      is_read: data.is_read,
      created_at: data.created_at,
      sender: senderProfile || undefined
    };
  } catch (error) {
    console.error("Error in sendBookingMessage:", error);
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
      console.error("Upload error:", uploadError);
      throw uploadError;
    }
    
    // Get the public URL of the uploaded file
    const { data } = supabase.storage
      .from("message_attachments")
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  } catch (error) {
    console.error("Error in uploadMessageAttachment:", error);
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
      console.error("Error marking message as read:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in markMessageAsRead:", error);
  }
};
