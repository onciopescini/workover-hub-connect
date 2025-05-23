
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/booking";
import { toast } from "@/hooks/use-toast";

/**
 * Fetch messages for a specific booking
 */
export const fetchBookingMessages = async (bookingId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
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
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as Message[] || [];
  } catch (error) {
    console.error("Error fetching messages:", error);
    toast({
      title: "Error",
      description: "Failed to load messages. Please try again later.",
      variant: "destructive",
    });
    return [];
  }
};

/**
 * Send a new message for a booking
 */
export const sendBookingMessage = async (
  bookingId: string, 
  content: string,
  attachmentUrl?: string
): Promise<Message | null> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        booking_id: bookingId,
        sender_id: userData.user.id,
        content,
        attachment_url: attachmentUrl || null
      })
      .select()
      .single();

    if (error) throw error;
    return data as Message;
  } catch (error) {
    console.error("Error sending message:", error);
    toast({
      title: "Error",
      description: "Failed to send message. Please try again later.",
      variant: "destructive",
    });
    return null;
  }
};

/**
 * Upload an attachment for a message
 */
export const uploadMessageAttachment = async (
  file: File
): Promise<string | null> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    const userId = userData.user.id;
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('message_attachments')
      .upload(fileName, file);
    
    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from('message_attachments')
      .getPublicUrl(data.path);
      
    return publicUrl.publicUrl;
  } catch (error) {
    console.error("Error uploading attachment:", error);
    toast({
      title: "Error",
      description: "Failed to upload attachment. Please try again later.",
      variant: "destructive",
    });
    return null;
  }
};

/**
 * Mark a message as read
 */
export const markMessageAsRead = async (messageId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("id", messageId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error marking message as read:", error);
    return false;
  }
};

/**
 * Get unread message count for a user
 */
export const getUnreadMessageCount = async (): Promise<number> => {
  try {
    // For coworker: Get unread messages from their bookings
    const { data: coworkerData, error: coworkerError } = await supabase
      .from("messages")
      .select("id", { count: "exact" })
      .eq("is_read", false)
      .not("sender_id", "eq", await getCurrentUserId())
      .in("booking_id", await getUserBookingIds());

    if (coworkerError) throw coworkerError;
    
    // For host: Get unread messages from bookings for their spaces
    const { data: hostData, error: hostError } = await supabase
      .from("messages")
      .select("id", { count: "exact" })
      .eq("is_read", false)
      .not("sender_id", "eq", await getCurrentUserId())
      .in("booking_id", await getHostSpaceBookingIds());
      
    if (hostError) throw hostError;
    
    return (coworkerData?.length || 0) + (hostData?.length || 0);
  } catch (error) {
    console.error("Error getting unread message count:", error);
    return 0;
  }
};

// Helper function to get current user ID
const getCurrentUserId = async (): Promise<string> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || '';
};

// Helper function to get booking IDs for the current user (as coworker)
const getUserBookingIds = async (): Promise<string[]> => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return [];
  
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("user_id", data.user.id);
    
  return bookings?.map(b => b.id) || [];
};

// Helper function to get booking IDs for spaces owned by the current user (as host)
const getHostSpaceBookingIds = async (): Promise<string[]> => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return [];
  
  const { data: spacesData } = await supabase
    .from("spaces")
    .select("id")
    .eq("host_id", data.user.id);
    
  if (!spacesData?.length) return [];
  
  const spaceIds = spacesData.map(s => s.id);
  
  const { data: bookingsData } = await supabase
    .from("bookings")
    .select("id")
    .in("space_id", spaceIds);
    
  return bookingsData?.map(b => b.id) || [];
};
