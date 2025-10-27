
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SupportTicket } from "@/types/support";
import { sreLogger } from '@/lib/sre-logger';
import { supportTicketSchema, type SupportTicketInput } from '@/schemas/supportTicketSchema';

// Rate limiting using localStorage
const RATE_LIMIT_KEY = 'support_ticket_timestamps';
const RATE_LIMIT_MAX = 3; // Max tickets
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes

export const checkClientRateLimit = (): { allowed: boolean; waitTime?: number } => {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    const timestamps: number[] = stored ? JSON.parse(stored) : [];
    const now = Date.now();
    
    // Filter out old timestamps (outside the window)
    const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
    
    if (recentTimestamps.length >= RATE_LIMIT_MAX) {
      const oldestTimestamp = Math.min(...recentTimestamps);
      const waitTime = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestTimestamp)) / 1000);
      return { allowed: false, waitTime };
    }
    
    return { allowed: true };
  } catch (error) {
    sreLogger.error('Error checking rate limit', { error });
    return { allowed: true }; // Allow on error
  }
};

const recordTicketAttempt = () => {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    const timestamps: number[] = stored ? JSON.parse(stored) : [];
    const now = Date.now();
    
    // Keep only recent timestamps
    const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
    recentTimestamps.push(now);
    
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recentTimestamps));
  } catch (error) {
    sreLogger.error('Error recording ticket attempt', { error });
  }
};

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

// Retry logic for network errors
const invokeWithRetry = async (
  functionName: string,
  body: any,
  maxRetries: number = 2
): Promise<{ data: any; error: any }> => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await supabase.functions.invoke(functionName, { body });
      
      // If we get a 5xx error, retry
      if (result.error && result.error.message?.includes('5')) {
        lastError = result.error;
        if (attempt < maxRetries) {
          sreLogger.warn(`Retry attempt ${attempt + 1} after 5xx error`, { error: result.error });
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
          continue;
        }
      }
      
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        sreLogger.warn(`Retry attempt ${attempt + 1} after error`, { error });
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  return { data: null, error: lastError };
};

// Create a new support ticket
export const createSupportTicket = async (ticket: SupportTicketInput): Promise<{
  success: boolean;
  ticket_id?: string;
  user_email?: string;
  user_name?: string;
}> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      toast.error("Devi essere autenticato per creare un ticket");
      return { success: false };
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.user.id)
      .single();

    const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Utente';
    const userEmail = user.user.email;

    // Validate with Zod schema
    const validated = supportTicketSchema.safeParse(ticket);
    if (!validated.success) {
      const firstError = validated.error.errors[0];
      toast.error(firstError?.message || 'Dati non validi');
      sreLogger.error('Validation error', { errors: validated.error });
      return { success: false };
    }

    // Check client-side rate limit
    const rateLimitCheck = checkClientRateLimit();
    if (!rateLimitCheck.allowed) {
      toast.error(`Hai inviato troppi ticket. Riprova tra ${rateLimitCheck.waitTime} secondi.`);
      sreLogger.warn('Rate limit exceeded', { userId: user.user.id, waitTime: rateLimitCheck.waitTime });
      return { success: false };
    }

    // Check online status
    if (!navigator.onLine) {
      toast.error("Nessuna connessione internet. Verifica la tua connessione e riprova.");
      return { success: false };
    }

    // Server-side spam check (legacy, will be replaced by edge function check)
    const { data: recentTickets } = await supabase
      .from('support_tickets')
      .select('id, created_at')
      .eq('user_id', user.user.id)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString())
      .limit(5);
    
    if (recentTickets && recentTickets.length >= 5) {
      toast.error("Hai raggiunto il limite di 5 ticket per ora. Riprova più tardi.");
      sreLogger.warn('Spam attempt blocked', { userId: user.user.id });
      return { success: false };
    }

    // Call Edge Function with retry
    sreLogger.info('Invoking support-tickets edge function', {
      userId: user.user.id,
      subject: validated.data.subject.substring(0, 50),
      category: validated.data.category
    });

    const { data, error } = await invokeWithRetry('support-tickets', {
      user_id: user.user.id,
      subject: validated.data.subject,
      message: validated.data.message,
      category: validated.data.category,
      priority: validated.data.priority
    });

    if (error) {
      sreLogger.error('Edge function invocation failed', { 
        error,
        errorMessage: error.message,
        errorContext: error.context 
      });
      
      // Enhanced error messages
      let errorMessage = "Errore nella creazione del ticket. Riprova più tardi.";
      
      if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        errorMessage = "Timeout del server. Verifica la connessione e riprova.";
      } else if (error.message?.includes('Network') || error.message?.includes('Failed to fetch')) {
        errorMessage = "Errore di rete. Verifica la connessione internet.";
      } else if (error.message?.includes('5')) {
        errorMessage = "Errore del server. Il nostro team è stato notificato. Riprova tra qualche minuto.";
      } else if (data && typeof data === 'object' && 'error' in data) {
        errorMessage = data.error;
      }
      
      toast.error(errorMessage);
      return { success: false };
    }

    if (data?.error) {
      sreLogger.error('Edge function returned error', { 
        backendError: data.error,
        ticketData: data 
      });
      toast.error(`Errore: ${data.error}`);
      return { success: false };
    }

    const ticketId = data?.ticket?.id;
    
    // Record successful attempt for rate limiting
    recordTicketAttempt();

    sreLogger.info('Ticket created successfully', { 
      ticketId,
      status: data?.ticket?.status 
    });

    // Send email notification (non-blocking)
    if (ticketId && userEmail) {
      sreLogger.info('Sending support notification email', { ticketId });
      
      // Call email notification edge function (don't await to avoid blocking)
      supabase.functions.invoke('send-support-notification', {
        body: {
          ticket_id: ticketId,
          user_email: userEmail,
          user_name: userName,
          category: validated.data.category,
          priority: validated.data.priority,
          subject: validated.data.subject,
          message: validated.data.message
        }
      }).then(({ error: emailError }) => {
        if (emailError) {
          sreLogger.warn('Failed to send email notification', { 
            error: emailError, 
            ticketId 
          });
        } else {
          sreLogger.info('Email notification sent successfully', { ticketId });
        }
      }).catch(error => {
        sreLogger.warn('Error sending email notification', { error, ticketId });
      });
    }
    
    toast.success("Ticket creato con successo! Riceverai una conferma via email.");
    
    const result: {
      success: boolean;
      ticket_id?: string;
      user_email?: string;
      user_name?: string;
    } = { 
      success: true, 
      ticket_id: ticketId,
      user_name: userName
    };
    
    if (userEmail) {
      result.user_email = userEmail;
    }
    
    return result;
  } catch (error) {
    sreLogger.error('Error creating ticket via Edge Function', { error });
    
    // Enhanced error handling for caught exceptions
    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        toast.error("Errore di connessione. Verifica la tua rete e riprova.");
      } else {
        toast.error("Errore imprevisto. Contattaci via email a info@workover.it.com");
      }
    } else {
      toast.error("Errore nella creazione del ticket");
    }
    
    return { success: false };
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
      toast.error("Errore nell'aggiornamento del ticket");
      sreLogger.error('Failed to update support ticket', { error, ticketId, updates });
      return false;
    }

    toast.success("Ticket aggiornato con successo");
    return true;
  } catch (error) {
    sreLogger.error('Error updating support ticket', { error, ticketId, updates });
    toast.error("Errore nell'aggiornamento del ticket");
    return false;
  }
};
