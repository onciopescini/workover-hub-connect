import { supabase } from "@/integrations/supabase/client";
import { getOrCreateConversation } from "./conversations";
import { sreLogger } from "@/lib/sre-logger";
import { toast } from "sonner";

/**
 * Crea o recupera una conversazione di chat privata con un utente specifico.
 * L'iniziatore è il 'coworker', il destinatario è l' 'host'.
 */
export async function createOrGetPrivateChat(targetUserId: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      sreLogger.warn('Tentativo di avviare chat senza autenticazione');
      return null;
    }

    if (user.id === targetUserId) {
      sreLogger.warn('Tentativo di avviare chat con se stessi');
      return null;
    }

    const conversationId = await getOrCreateConversation({
      hostId: targetUserId,      // Il destinatario è l'Host
      coworkerId: user.id,        // L'iniziatore è il Coworker
      spaceId: null,
      bookingId: null
    });

    return conversationId;
  } catch (error) {
    sreLogger.error('Errore nella creazione della chat privata', { targetUserId }, error as Error);
    return null;
  }
}

/**
 * Invia una richiesta di connessione (Networking).
 */
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
      if (error.code === '23505') { // Violazione unicità
        toast.info("Richiesta di connessione già inviata");
        return true;
      }
      throw error;
    }

    toast.success("Richiesta di connessione inviata");
    return true;
  } catch (error) {
    sreLogger.error('Errore invio richiesta connessione', { targetUserId }, error as Error);
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
    sreLogger.error('Errore accettazione connessione', { requestId }, error as Error);
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
    sreLogger.error('Errore rifiuto connessione', { requestId }, error as Error);
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
    sreLogger.error('Errore rimozione connessione', { connectionId }, error as Error);
    toast.error("Errore nella rimozione della connessione");
    return false;
  }
}