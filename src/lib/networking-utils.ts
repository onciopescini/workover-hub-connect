
import { supabase } from "@/integrations/supabase/client";
import { Connection, ConnectionSuggestion, PrivateChat, PrivateMessage } from "@/types/networking";
import { toast } from "sonner";

// Fetch user connections
export const getUserConnections = async (): Promise<Connection[]> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return [];

    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        sender:profiles!sender_id (
          id,
          first_name,
          last_name,
          profile_photo_url,
          bio
        ),
        receiver:profiles!receiver_id (
          id,
          first_name,
          last_name,
          profile_photo_url,
          bio
        )
      `)
      .or(`sender_id.eq.${user.user.id},receiver_id.eq.${user.user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Cast esplicito per il campo status
    return (data || []).map(conn => ({
      ...conn,
      status: conn.status as 'pending' | 'accepted' | 'rejected'
    }));
  } catch (error) {
    console.error("Error fetching connections:", error);
    return [];
  }
};

// Send connection request
export const sendConnectionRequest = async (receiverId: string): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      toast.error("Devi essere autenticato per inviare richieste di connessione");
      return false;
    }

    const { error } = await supabase
      .from('connections')
      .insert({
        sender_id: user.user.id,
        receiver_id: receiverId,
        status: 'pending'
      });

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        toast.error("Hai già inviato una richiesta a questo utente");
      } else {
        toast.error("Errore nell'invio della richiesta");
      }
      return false;
    }

    toast.success("Richiesta di connessione inviata!");
    return true;
  } catch (error) {
    console.error("Error sending connection request:", error);
    toast.error("Errore nell'invio della richiesta");
    return false;
  }
};

// Accept connection request
export const acceptConnectionRequest = async (connectionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId);

    if (error) throw error;

    toast.success("Connessione accettata!");
    return true;
  } catch (error) {
    console.error("Error accepting connection:", error);
    toast.error("Errore nell'accettare la connessione");
    return false;
  }
};

// Reject connection request
export const rejectConnectionRequest = async (connectionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'rejected' })
      .eq('id', connectionId);

    if (error) throw error;

    toast.success("Connessione rifiutata");
    return true;
  } catch (error) {
    console.error("Error rejecting connection:", error);
    toast.error("Errore nel rifiutare la connessione");
    return false;
  }
};

// Remove connection
export const removeConnection = async (connectionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId);

    if (error) throw error;

    toast.success("Connessione rimossa");
    return true;
  } catch (error) {
    console.error("Error removing connection:", error);
    toast.error("Errore nella rimozione della connessione");
    return false;
  }
};

// Get connection suggestions
export const getConnectionSuggestions = async (): Promise<ConnectionSuggestion[]> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return [];

    const { data, error } = await supabase
      .from('connection_suggestions')
      .select(`
        *,
        suggested_user:profiles!suggested_user_id (
          id,
          first_name,
          last_name,
          profile_photo_url,
          bio
        )
      `)
      .eq('user_id', user.user.id)
      .order('score', { ascending: false })
      .limit(20);

    if (error) throw error;
    
    // Cast esplicito e sicuro per tutti i campi
    return (data || []).map(suggestion => ({
      ...suggestion,
      reason: suggestion.reason as 'shared_space' | 'shared_event' | 'similar_interests',
      shared_context: (suggestion.shared_context ?? {}) as Record<string, any>,
      score: suggestion.score ?? 0,
      created_at: suggestion.created_at ?? new Date().toISOString()
    }));
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
};

// Generate new suggestions
export const generateSuggestions = async (): Promise<void> => {
  try {
    const { error } = await supabase.rpc('generate_connection_suggestions');
    if (error) throw error;
  } catch (error) {
    console.error("Error generating suggestions:", error);
  }
};

// Get user's private chats
export const getUserPrivateChats = async (): Promise<PrivateChat[]> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return [];

    const { data, error } = await supabase
      .from('private_chats')
      .select(`
        *,
        participant_1:profiles!participant_1_id (
          id,
          first_name,
          last_name,
          profile_photo_url
        ),
        participant_2:profiles!participant_2_id (
          id,
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .or(`participant_1_id.eq.${user.user.id},participant_2_id.eq.${user.user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching private chats:", error);
    return [];
  }
};

// Create or get private chat
export const createOrGetPrivateChat = async (otherUserId: string): Promise<string | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return null;

    const userId = user.user.id;

    // Check if chat already exists
    const { data: existingChat } = await supabase
      .from('private_chats')
      .select('id')
      .or(`and(participant_1_id.eq.${userId},participant_2_id.eq.${otherUserId}),and(participant_1_id.eq.${otherUserId},participant_2_id.eq.${userId})`)
      .single();

    if (existingChat) {
      return existingChat.id;
    }

    // Create new chat
    const { data: newChat, error } = await supabase
      .from('private_chats')
      .insert({
        participant_1_id: userId,
        participant_2_id: otherUserId
      })
      .select('id')
      .single();

    if (error) throw error;
    return newChat?.id || null;
  } catch (error) {
    console.error("Error creating/getting private chat:", error);
    return null;
  }
};

// Send private message
export const sendPrivateMessage = async (chatId: string, content: string): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return false;

    const { error } = await supabase
      .from('private_messages')
      .insert({
        chat_id: chatId,
        sender_id: user.user.id,
        content
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error sending private message:", error);
    return false;
  }
};

// Get private messages for a chat
export const getPrivateMessages = async (chatId: string): Promise<PrivateMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('private_messages')
      .select(`
        *,
        sender:profiles!sender_id (
          id,
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Cast esplicito per il campo attachments
    return (data || []).map(message => ({
      ...message,
      attachments: (message.attachments ?? []) as string[]
    }));
  } catch (error) {
    console.error("Error fetching private messages:", error);
    return [];
  }
};
