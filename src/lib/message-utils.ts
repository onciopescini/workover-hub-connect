
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/booking";
import { toast } from "@/hooks/use-toast";

// Fetch messages for a specific booking
export const fetchBookingMessages = async (bookingId: string): Promise<Message[]> => {
  try {
    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender:sender_id (
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .eq("booking_id", bookingId)
      .order("created_at");

    if (error) {
      throw error;
    }
    
    return messages as Message[];
  } catch (error) {
    console.error("Error fetching messages:", error);
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
        attachments,
        is_read: false
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as Message;
  } catch (error) {
    console.error("Error sending message:", error);
    toast({
      title: "Error sending message",
      description: "Please try again later",
      variant: "destructive"
    });
    return null;
  }
};

// Upload an image attachment for a message
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
      throw uploadError;
    }
    
    // Get the public URL of the uploaded file
    const { data } = supabase.storage
      .from("message_attachments")
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  } catch (error) {
    console.error("Error uploading attachment:", error);
    toast({
      title: "Error uploading file",
      description: "Please try again with a smaller file or different format",
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
      throw error;
    }
  } catch (error) {
    console.error("Error marking message as read:", error);
  }
};
