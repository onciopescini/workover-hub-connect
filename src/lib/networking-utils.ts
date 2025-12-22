import { supabase } from "@/integrations/supabase/client";
import { getOrCreateConversation } from "./conversations";
import { sreLogger } from "@/lib/sre-logger";
import { toast } from "sonner";

/**
 * Creates or retrieves a private chat conversation with a specific user.
 *
 * In the context of networking/private chats:
 * - The current user (initiator) is treated as the 'coworker'
 * - The target user (recipient) is treated as the 'host'
 *
 * The underlying database RPC `get_or_create_conversation` handles bidirectional checks,
 * so it will find an existing conversation regardless of who initiated it originally.
 */
export async function createOrGetPrivateChat(targetUserId: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      sreLogger.warn('Attempted to start chat without authentication');
      return null;
    }

    if (user.id === targetUserId) {
      sreLogger.warn('Attempted to start chat with self');
      return null;
    }

    const conversationId = await getOrCreateConversation({
      hostId: targetUserId,      // Target is Host
      coworkerId: user.id,       // Initiator is Coworker
      spaceId: null,
      bookingId: null
    });

    return conversationId;
  } catch (error) {
    sreLogger.error('Failed to create or get private chat', { targetUserId }, error as Error);
    return null;
  }
}

export async function sendConnectionRequest(targetUserId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Devi essere loggato per connetterti");
      return false;
    }

    const { error } = await supabase
      .from('connections')
      .insert({
        sender_id: user.id,
        receiver_id: targetUserId,
        status: 'pending'
      });

    if (error) {
      if (error.code === '23505') { // Unique violation
        toast.info("Richiesta di connessione già inviata");
        return true;
      }
      throw error;
    }

    toast.success("Richiesta di connessione inviata");
    return true;
  } catch (error) {
    sreLogger.error('Failed to send connection request', { targetUserId }, error as Error);
    toast.error("Errore nell'invio della richiesta");
    return false;
  }
}

export async function acceptConnectionRequest(requestId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) throw error;

    toast.success("Connessione accettata");
    return true;
  } catch (error) {
    sreLogger.error('Failed to accept connection request', { requestId }, error as Error);
    toast.error("Errore nell'accettare la richiesta");
    return false;
  }
}

export async function rejectConnectionRequest(requestId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) throw error;

    toast.success("Connessione rifiutata");
    return true;
  } catch (error) {
    sreLogger.error('Failed to reject connection request', { requestId }, error as Error);
    toast.error("Errore nel rifiutare la richiesta");
    return false;
  }
}

export async function removeConnection(connectionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId);

    if (error) throw error;

    toast.success("Connessione rimossa");
    return true;
  } catch (error) {
    sreLogger.error('Failed to remove connection', { connectionId }, error as Error);
    toast.error("Errore nella rimozione della connessione");
    return false;
  }
}
