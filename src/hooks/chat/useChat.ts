import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArchiveConversationPayload,
  ChatParticipant,
  Conversation,
  DeleteMessagePayload,
  MarkConversationUnreadPayload,
  Message,
} from "@/types/chat";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { queryKeys } from "@/lib/react-query-config";

interface ConversationQueryResult {
  id: string;
  updated_at: string;
  last_message: string | null;
  last_message_at: string | null;
  conversation_participants: {
    user_id?: string | null;
    archived_at?: string | null;
    last_read_at?: string | null;
    profiles: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      profile_photo_url: string | null;
    };
  }[];
  participant_status?: {
    user_id: string;
    archived_at: string | null;
    last_read_at: string | null;
  }[];
}

export interface UseChatResult {
  conversations: Conversation[];
  activeMessages: Message[];
  isLoading: boolean;
  isMessagesLoading: boolean;
  sendMessage: (content: string) => void;
  deleteMessage: (payload: DeleteMessagePayload) => void;
  archiveConversation: (payload: ArchiveConversationPayload) => void;
  markConversationUnread: (payload: MarkConversationUnreadPayload) => void;
  isSending: boolean;
  isDeletingMessage: boolean;
  isArchivingConversation: boolean;
  isMarkingConversationUnread: boolean;
  currentUser: User | null;
  messagesEndRef: RefObject<HTMLDivElement>;
}

export const useChat = (activeConversationId?: string): UseChatResult => {
  const { authState } = useAuth();
  const user = authState.user;
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationsQueryKey = useMemo(
    () => [...queryKeys.messages.conversations(), user?.id ?? ""] as const,
    [user?.id]
  );
  const messagesQueryKey = useMemo(
    () =>
      activeConversationId
        ? queryKeys.messages.conversation(activeConversationId)
        : queryKeys.messages.conversation("unknown"),
    [activeConversationId]
  );

  // Fetch Conversations (Optimized)
  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: conversationsQueryKey,
    queryFn: async (): Promise<Conversation[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id,
          updated_at,
          last_message,
          last_message_at,
          participant_status:conversation_participants!inner (
            user_id,
            archived_at,
            last_read_at
          ),
          conversation_participants:conversation_participants (
            user_id,
            archived_at,
            last_read_at,
            profiles (
              id,
              first_name,
              last_name,
              profile_photo_url
            )
          )
        `)
        .eq("participant_status.user_id", user.id)
        .is("participant_status.archived_at", null)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching conversations:", error);
        toast.error("Impossibile caricare le conversazioni");
        return [];
      }

      const conversationRows: ConversationQueryResult[] = data ?? [];

      return conversationRows.map((conv) => ({
        id: conv.id,
        updated_at: conv.updated_at,
        participants: conv.conversation_participants.map((cp): ChatParticipant => ({
          id: cp.profiles.id,
          first_name: cp.profiles.first_name,
          last_name: cp.profiles.last_name,
          profile_photo_url: cp.profiles.profile_photo_url,
          avatar_url: cp.profiles.profile_photo_url || null,
        })),
        last_message: conv.last_message
          ? {
              content: conv.last_message,
              created_at: conv.last_message_at || conv.updated_at,
            }
          : null,
        archived_at: conv.participant_status?.[0]?.archived_at ?? null,
        last_read_at: conv.participant_status?.[0]?.last_read_at ?? null,
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch Messages for active conversation
  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: messagesQueryKey,
    queryFn: async (): Promise<Message[]> => {
      if (!activeConversationId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, content, created_at, is_read")
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
        queryClient.invalidateQueries({ queryKey: messagesQueryKey });
        queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
    },
    onError: (error) => {
        toast.error("Errore nell'invio del messaggio");
        console.error(error);
    }
  });

  const deleteMessage = useMutation({
    mutationFn: async (payload: DeleteMessagePayload) => {
      const { messageId } = payload;
      if (!messageId) {
        throw new Error("Missing message id");
      }
      const { error } = await supabase.from("messages").delete().eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversation(variables.conversationId) });
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.unreadCount() });
    },
    onError: (error) => {
      toast.error("Errore nell'eliminazione del messaggio");
      console.error(error);
    }
  });

  const archiveConversation = useMutation({
    mutationFn: async (payload: ArchiveConversationPayload) => {
      const { conversationId } = payload;
      if (!conversationId || !user?.id) {
        throw new Error("Missing conversation or user");
      }
      const { error } = await supabase
        .from("conversation_participants")
        .update({ archived_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.unreadCount() });
    },
    onError: (error) => {
      toast.error("Errore nell'archiviazione della conversazione");
      console.error(error);
    }
  });

  const markConversationUnread = useMutation({
    mutationFn: async (payload: MarkConversationUnreadPayload) => {
      const { conversationId } = payload;
      if (!conversationId || !user?.id) {
        throw new Error("Missing conversation or user");
      }
      const { error } = await supabase
        .from("conversation_participants")
        .update({ last_read_at: null })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.unreadCount() });
    },
    onError: (error) => {
      toast.error("Errore nel contrassegnare come non letto");
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
          queryClient.invalidateQueries({ queryKey: messagesQueryKey });
           // Also update conversation list for last message preview
          queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
          queryClient.invalidateQueries({ queryKey: queryKeys.messages.unreadCount() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, conversationsQueryKey, messagesQueryKey, queryClient, user?.id]);

  useEffect(() => {
    if (!messages?.length) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  return {
    conversations: conversations || [],
    activeMessages: messages || [],
    isLoading: isLoadingConversations,
    isMessagesLoading: isLoadingMessages,
    sendMessage: sendMessage.mutate,
    deleteMessage: deleteMessage.mutate,
    archiveConversation: archiveConversation.mutate,
    markConversationUnread: markConversationUnread.mutate,
    isSending: sendMessage.isPending,
    isDeletingMessage: deleteMessage.isPending,
    isArchivingConversation: archiveConversation.isPending,
    isMarkingConversationUnread: markConversationUnread.isPending,
    currentUser: user,
    messagesEndRef,
  };
};
