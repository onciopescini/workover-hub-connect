
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SupportTicket } from "@/types/support";
import { sreLogger } from '@/lib/sre-logger';
import { supportTicketSchema, type SupportTicketInput } from '@/schemas/supportTicketSchema';

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
    sreLogger.error('Error fetching support tickets', { error });
    return [];
  }
};

// Create a new support ticket
export const createSupportTicket = async (ticket: SupportTicketInput): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      toast.error("Devi essere autenticato");
      return false;
    }

    // Validate with Zod schema
    const validated = supportTicketSchema.safeParse(ticket);
    if (!validated.success) {
      toast.error('Dati non validi');
      sreLogger.error('Validation error', { errors: validated.error });
      return false;
    }

    // Client-side spam check
    const { data: recentTickets } = await supabase
      .from('support_tickets')
      .select('id, created_at')
      .eq('user_id', user.user.id)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString())
      .limit(5);
    
    if (recentTickets && recentTickets.length >= 5) {
      toast.error("Hai raggiunto il limite di 5 ticket per ora. Riprova più tardi.");
      sreLogger.warn('Spam attempt blocked', { userId: user.user.id });
      return false;
    }

    // Call Edge Function
    sreLogger.info('Invoking support-tickets edge function', {
      userId: user.user.id,
      subject: validated.data.subject.substring(0, 50),
      category: validated.data.category
    });

    const { data, error } = await supabase.functions.invoke('support-tickets', {
      body: {
        user_id: user.user.id,
        subject: validated.data.subject,
        message: validated.data.message,
        category: validated.data.category,
        priority: validated.data.priority
      }
    });

    if (error) {
      sreLogger.error('Edge function invocation failed', { 
        error,
        errorMessage: error.message,
        errorContext: error.context 
      });
      toast.error(`Errore chiamata edge function: ${error.message}`);
      return false;
    }

    if (data?.error) {
      sreLogger.error('Edge function returned error', { 
        backendError: data.error,
        ticketData: data 
      });
      toast.error(`Errore backend: ${data.error}`);
      return false;
    }

    sreLogger.info('Ticket created successfully', { 
      ticketId: data?.ticket?.id,
      status: data?.ticket?.status 
    });
    
    toast.success("Ticket creato! Riceverai una conferma via email.");
    return true;
  } catch (error) {
    sreLogger.error('Error creating ticket via Edge Function', { error });
    toast.error("Errore nella creazione del ticket");
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
      sreLogger.error('Failed to update support ticket', { error, ticketId, updates });
      return false;
    }

    toast.success("Support ticket updated successfully");
    return true;
  } catch (error) {
    sreLogger.error('Error updating support ticket', { error, ticketId, updates });
    toast.error("Failed to update support ticket");
    return false;
  }
};
