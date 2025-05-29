
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/booking";
import { toast } from "@/hooks/use-toast";

// Fetch messages for a specific booking
export const fetchBookingMessages = async (bookingId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        id,
        booking_id,
        sender_id,
        content,
        attachments,
        is_read,
        created_at,
        sender:profiles!sender_id (
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .eq("booking_id", bookingId)
      .order("created_at");

    if (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
    
    return data as unknown as Message[];
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
        created_at,
        sender:profiles!sender_id (
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .single();
    
    if (error) {
      console.error("Error sending message:", error);
      throw error;
    }
    
    return data as unknown as Message;
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
