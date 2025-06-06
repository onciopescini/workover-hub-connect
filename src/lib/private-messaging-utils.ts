import { supabase } from "@/integrations/supabase/client";
import { PrivateChat, PrivateMessage } from "@/types/networking";
import { toast } from "@/hooks/use-toast";

// Trova o crea una chat privata tra due utenti
export const findOrCreatePrivateChat = async (participantId: string): Promise<PrivateChat | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error("User not authenticated");
    }

    const currentUserId = user.user.id;

    // Cerca una chat esistente tra i due utenti
    const { data: existingChat, error: searchError } = await supabase
      .from("private_chats")
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
      .or(`and(participant_1_id.eq.${currentUserId},participant_2_id.eq.${participantId}),and(participant_1_id.eq.${participantId},participant_2_id.eq.${currentUserId})`)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      throw searchError;
    }

    if (existingChat) {
      return existingChat as unknown as PrivateChat;
    }

    // Crea una nuova chat se non esiste
    const { data: newChat, error: createError } = await supabase
      .from("private_chats")
      .insert({
        participant_1_id: currentUserId,
        participant_2_id: participantId
      })
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
      .single();

    if (createError) {
      throw createError;
    }

    return newChat as unknown as PrivateChat;
  } catch (error) {
    console.error("Error finding/creating private chat:", error);
    toast({
      title: "Errore",
      description: "Impossibile aprire la chat",
      variant: "destructive"
    });
    return null;
  }
};

// Recupera i messaggi di una chat privata
export const fetchPrivateMessages = async (chatId: string): Promise<PrivateMessage[]> => {
  try {
    const { data, error } = await supabase
      .from("private_messages")
      .select(`
        *,
        sender:profiles!sender_id (
          id,
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .eq("chat_id", chatId)
      .order("created_at");

    if (error) {
      throw error;
    }
    
    return data as unknown as PrivateMessage[];
  } catch (error) {
    console.error("Error fetching private messages:", error);
    return [];
  }
};

// Invia un messaggio privato
export const sendPrivateMessage = async (
  chatId: string, 
  content: string,
  attachments: string[] = []
): Promise<PrivateMessage | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error("User not authenticated");
    }
    
    const { data, error } = await supabase
      .from("private_messages")
      .insert({
        chat_id: chatId,
        sender_id: user.user.id,
        content,
        attachments
      })
      .select(`
        *,
        sender:profiles!sender_id (
          id,
          first_name,
          last_name,
          profile_photo_url
        )
      `)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as unknown as PrivateMessage;
  } catch (error) {
    console.error("Error sending private message:", error);
    toast({
      title: "Errore nell'invio del messaggio",
      description: "Riprova più tardi",
      variant: "destructive"
    });
    return null;
  }
};
