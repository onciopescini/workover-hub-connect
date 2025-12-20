import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { fetchConversations, fetchUnreadCounts, markConversationAsRead, fetchConversationMessages } from '@/lib/conversations';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export const useUnifiedMessaging = () => {
  const { authState } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeMessages, setActiveMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const activeConversationId = searchParams.get('id');

  // Load messages for active conversation
  useEffect(() => {
    if (activeConversationId) {
      fetchConversationMessages(activeConversationId)
        .then(setActiveMessages)
        .catch(err => console.error("Error loading messages", err));
    } else {
      setActiveMessages([]);
    }
  }, [activeConversationId]);

  const setActiveConversationId = useCallback((id: string | null) => {
    if (id) {
      setSearchParams({ id });
      // Optimistically mark as read
      if (authState.user?.id) {
         markConversationAsRead(id, authState.user.id);
         setUnreadCounts(prev => ({ ...prev, [id]: 0 }));
      }
    } else {
      setSearchParams({});
    }
  }, [setSearchParams, authState.user?.id]);

  const refreshData = useCallback(async () => {
    if (!authState.user?.id) return;
    try {
      const [convs, unreads] = await Promise.all([
        fetchConversations(authState.user.id),
        fetchUnreadCounts(authState.user.id)
      ]);
      setConversations(convs);
      setUnreadCounts(unreads);
    } catch (error) {
      console.error("Error fetching messaging data:", error);
      toast.error("Impossibile caricare i messaggi");
    } finally {
      setIsLoading(false);
    }
  }, [authState.user?.id]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Realtime Subscription
  useEffect(() => {
    if (!authState.user?.id) return;

    const channel = supabase
      .channel('unified-messaging')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          // Determine if this message is relevant to us
          // Since we don't have easy access to participant list without joining,
          // we might just refresh.
          // However, for performance, we can check if conversation_id exists in our list.

          if (payload.eventType === 'INSERT') {
             const newMessage = payload.new as any;
             // If we are the sender, we don't need to increment unread.
             // If we are receiver (or not sender), increment unread.
             // Note: payload.new doesn't tell us who the participants are unless we check existing conversations.

             const isMeSender = newMessage.sender_id === authState.user?.id;

             // Update conversations list order/content
             setConversations(prev => {
                const existingIdx = prev.findIndex(c => c.id === newMessage.conversation_id);
                if (existingIdx === -1) {
                  // New conversation? Refresh entire list to get details
                  refreshData();
                  return prev;
                }

                const updatedConv = {
                  ...prev[existingIdx],
                  last_message: newMessage.content,
                  last_message_at: newMessage.created_at
                };

                // Move to top
                const newConvs = [...prev];
                newConvs.splice(existingIdx, 1);
                return [updatedConv, ...newConvs];
             });

             // Update active messages if relevant
             if (newMessage.conversation_id === activeConversationId) {
                setActiveMessages(prev => {
                   // Avoid duplicates just in case
                   if (prev.some(m => m.id === newMessage.id)) return prev;
                   return [...prev, newMessage];
                });
             }

             if (!isMeSender) {
                // If not current active conversation, increment unread
                if (newMessage.conversation_id !== activeConversationId) {
                   setUnreadCounts(prev => ({
                      ...prev,
                      [newMessage.conversation_id]: (prev[newMessage.conversation_id] || 0) + 1
                   }));
                   toast.info("Nuovo messaggio ricevuto");
                }
             }
          }
        }
      )
      .on(
        'postgres_changes',
        {
           event: '*',
           schema: 'public',
           table: 'conversations'
        },
        () => {
           // Conversation update (e.g. status change)
           refreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.user?.id, activeConversationId, refreshData]);

  return {
    conversations,
    unreadCounts,
    activeConversationId,
    activeMessages,
    setActiveConversationId,
    isLoading,
    refreshData
  };
};
