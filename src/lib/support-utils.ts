
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SupportTicket } from "@/types/support";

// Get support tickets for current user
export const getUserSupportTickets = async (): Promise<SupportTicket[]> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return [];

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return [];
  }
};

// Create a new support ticket
export const createSupportTicket = async (ticket: {
  subject: string;
  message: string;
  status: string;
}): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      toast.error("You must be logged in to create a support ticket");
      return false;
    }

    const { error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.user.id,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status
      });

    if (error) {
      toast.error("Failed to create support ticket");
      console.error(error);
      return false;
    }

    toast.success("Support ticket created successfully");
    return true;
  } catch (error) {
    console.error("Error creating support ticket:", error);
    toast.error("Failed to create support ticket");
    return false;
  }
};

// Update support ticket
export const updateSupportTicket = async (
  ticketId: string, 
  updates: Partial<SupportTicket>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId);

    if (error) {
      toast.error("Failed to update support ticket");
      console.error(error);
      return false;
    }

    toast.success("Support ticket updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating support ticket:", error);
    toast.error("Failed to update support ticket");
    return false;
  }
};
