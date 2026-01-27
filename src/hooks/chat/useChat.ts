import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArchiveConversationPayload,
  Conversation,
  DeleteMessagePayload,
  MarkConversationUnreadPayload,
  Message,
} from "@/types/chat";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { queryKeys } from "@/lib/react-query-config";
import * as chatService from "@/services/api/chatService";

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

  // Fetch Conversations using chatService
  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: conversationsQueryKey,
    queryFn: async (): Promise<Conversation[]> => {
      if (!user?.id) return [];

      const result = await chatService.fetchConversations(user.id);
      if (!result.success) {
        toast.error("Impossibile caricare le conversazioni");
        return [];
      }
      return result.conversations || [];
    },
    enabled: !!user?.id,
  });

  // Fetch Messages using chatService
  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: messagesQueryKey,
    queryFn: async (): Promise<Message[]> => {
      if (!activeConversationId) return [];

      const result = await chatService.fetchMessages(activeConversationId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.messages || [];
    },
    enabled: !!activeConversationId,
  });

  // Send Message Mutation using chatService
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!activeConversationId || !user?.id) throw new Error("Missing conversation or user");

      // Use chatService - NO FALLBACK UUID, booking_id can be null
      const result = await chatService.sendMessage({
        conversationId: activeConversationId,
        senderId: user.id,
        content
      });

      if (!result.success) {
        throw new Error(result.error);
      }
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
