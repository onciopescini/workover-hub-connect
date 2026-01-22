import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, Message, ChatParticipant } from "@/types/chat";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ConversationQueryResult {
  id: string;
  updated_at: string;
  last_message: string | null;
  last_message_at: string | null;
  conversation_participants: {
    profiles: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      profile_photo_url: string | null;
    };
  }[];
}

export interface UseChatResult {
  conversations: Conversation[];
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string) => void;
  isSending: boolean;
  currentUser: User | null;
}

export const useChat = (activeConversationId?: string): UseChatResult => {
  const { authState } = useAuth();
  const user = authState.user;
  const queryClient = useQueryClient();

  // Fetch Conversations (Optimized)
  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id,
          updated_at,
          last_message,
          last_message_at,
          conversation_participants!inner (
            profiles (
              id,
              first_name,
              last_name,
              profile_photo_url
            )
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching conversations:", error);
        toast.error("Impossibile caricare le conversazioni");
        return [];
      }

      const conversationRows = (data ?? []) as ConversationQueryResult[];

      return conversationRows.map((conv) => ({
        id: conv.id,
        updated_at: conv.updated_at,
        participants: conv.conversation_participants.map((cp) => ({
          id: cp.profiles.id,
          first_name: cp.profiles.first_name,
          last_name: cp.profiles.last_name,
          profile_photo_url: cp.profiles.profile_photo_url,
          avatar_url: cp.profiles.profile_photo_url || null // Email not exposed publicly
        })) as ChatParticipant[],
        last_message: conv.last_message
          ? {
              content: conv.last_message,
              created_at: conv.last_message_at || conv.updated_at,
            }
          : null,
      })) as Conversation[];
    },
    enabled: !!user?.id,
  });

  // Fetch Messages for active conversation
  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", activeConversationId],
    queryFn: async (): Promise<Message[]> => {
      if (!activeConversationId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        throw error;
      }

      return (data ?? []) as Message[];
    },
    enabled: !!activeConversationId,
  });

  // Send Message Mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
        if (!activeConversationId || !user?.id) throw new Error("Missing conversation or user");

        // First, get the booking_id associated with this conversation
        const { data: conversationData, error: convError } = await supabase
            .from("conversations")
            .select("booking_id")
            .eq("id", activeConversationId)
            .single();

        if (convError || !conversationData) {
             throw new Error("Could not find conversation details");
        }

        const bookingId = conversationData.booking_id;
        const effectiveBookingId = bookingId || "00000000-0000-0000-0000-000000000000"; // Fallback to avoid crash

        const { error } = await supabase
            .from("messages")
            .insert({
                conversation_id: activeConversationId,
                sender_id: user.id,
                content,
                booking_id: effectiveBookingId
            });

        if (error) throw error;

        // Update conversation updated_at
        await supabase
            .from("conversations")
            .update({
                updated_at: new Date().toISOString(),
                last_message: content,
                last_message_at: new Date().toISOString()
            })
            .eq("id", activeConversationId);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["messages", activeConversationId] });
        queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
    onError: (error) => {
        toast.error("Errore nell'invio del messaggio");
        console.error(error);
    }
  });

  // Realtime Subscription
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      .channel(`chat:${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          // Invalidate to fetch new message
          queryClient.invalidateQueries({ queryKey: ["messages", activeConversationId] });
           // Also update conversation list for last message preview
          queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, queryClient, user?.id]);

  return {
    conversations: conversations || [],
    messages: messages || [],
    isLoading: isLoadingConversations || isLoadingMessages,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    currentUser: user,
  };
};
