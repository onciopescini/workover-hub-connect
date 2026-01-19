import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { fetchConversations, fetchUnreadCounts, markConversationAsRead, fetchConversationMessages, sendMessageToConversation } from '@/lib/conversations';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Conversation, Message } from '@/types/messaging';

export const useUnifiedMessaging = () => {
  const { authState } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);

  const activeConversationId = searchParams.get('id');

  // Helper to mark read and update local state
  const handleMarkAsRead = useCallback(async (conversationId: string) => {
    if (!authState.user?.id) return;

    try {
       await markConversationAsRead(conversationId, authState.user.id);

       setUnreadCounts(prev => {
         const newCounts = { ...prev };
         delete newCounts[conversationId];
         return newCounts;
       });

       setActiveMessages(prev => prev.map(m => ({ ...m, is_read: true })));

    } catch (e) {
       console.error("Failed to mark conversation as read", e);
    }
  }, [authState.user?.id]);

  // Load messages for active conversation
  useEffect(() => {
    if (activeConversationId) {
      setIsMessagesLoading(true);
      fetchConversationMessages(activeConversationId)
        .then(messages => {
          setActiveMessages(messages);
          setIsMessagesLoading(false);
        })
        .catch(err => {
          console.error("Error loading messages", err);
          setIsMessagesLoading(false);
        });

      handleMarkAsRead(activeConversationId);
    } else {
      setActiveMessages([]);
      setIsMessagesLoading(false);
    }
  }, [activeConversationId, handleMarkAsRead]);

  const setActiveConversationId = useCallback((id: string | null) => {
    if (id) {
      setSearchParams({ id });
    } else {
      setSearchParams({});
    }
  }, [setSearchParams]);

  const refreshData = useCallback(async () => {
    if (!authState.user?.id) return;
    try {
      const [convs, unreads] = await Promise.all([
        fetchConversations(authState.user.id),
        fetchUnreadCounts(authState.user.id)
      ]);
      setConversations(convs || []);
      setUnreadCounts(unreads || {});
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

  const sendMessage = useCallback(async (content: string, attachments?: File[], retryTempId?: string) => {
    if (!activeConversationId || !authState.user?.id) return;

    const activeConversation = conversations.find(c => c.id === activeConversationId);

    // Determine recipient
    let recipientId = "";
    if (activeConversation) {
      if (authState.user.id === activeConversation.host_id) {
        recipientId = activeConversation.coworker_id;
      } else if (authState.user.id === activeConversation.coworker_id) {
        recipientId = activeConversation.host_id;
      } else {
         recipientId = activeConversation.host_id; // Fallback
      }
    }

    let tempId = retryTempId || crypto.randomUUID();

    if (retryTempId) {
       // Reset status to pending for existing message
       setActiveMessages(prev => prev.map(m =>
          (m.tempId === retryTempId || m.id === retryTempId)
            ? { ...m, status: 'pending' as const, created_at: new Date().toISOString() }
            : m
       ));
    } else {
       // Create new optimistic message
       const optimisticMessage: Message = {
         id: tempId,
         tempId: tempId,
         conversation_id: activeConversationId,
         sender_id: authState.user.id,
         content: content,
         created_at: new Date().toISOString(),
         is_read: false,
         booking_id: activeConversation?.booking_id,
         attachments: [],
         status: 'pending'
       };

       setActiveMessages(prev => [...prev, optimisticMessage]);

       // Update conversation list preview optimistically
       setConversations(prev => {
          const idx = prev.findIndex(c => c.id === activeConversationId);
          if (idx === -1) return prev;
          const updated = { ...prev[idx], last_message: content, last_message_at: new Date().toISOString() };
          const newArr = [...prev];
          newArr.splice(idx, 1);
          return [updated, ...newArr];
       });
    }

    try {
      await sendMessageToConversation({
        conversationId: activeConversationId,
        content: content,
        senderId: authState.user.id,
        bookingId: activeConversation?.booking_id,
        recipientId: recipientId
      });

      setActiveMessages(prev => prev.map(m =>
        (m.tempId === tempId || m.id === tempId) ? { ...m, status: 'sent' as const } : m
      ));

    } catch (error) {
      console.error("Failed to send message", error);
      setActiveMessages(prev => prev.map(m =>
        (m.tempId === tempId || m.id === tempId) ? { ...m, status: 'error' as const } : m
      ));
      toast.error("Errore nell'invio. Riprova.");
    }
  }, [activeConversationId, authState.user?.id, conversations]);

  // Realtime Subscription
  useEffect(() => {
    if (!authState.user?.id) return;

    const channel = supabase
      .channel('unified-messaging')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
             const newMessageData = payload.new as any;
             const isMeSender = newMessageData.sender_id === authState.user?.id;

             const newMessage: Message = {
                id: newMessageData.id,
                conversation_id: newMessageData.conversation_id,
                sender_id: newMessageData.sender_id,
                content: newMessageData.content,
                created_at: newMessageData.created_at,
                is_read: newMessageData.is_read || false,
                booking_id: newMessageData.booking_id,
                attachments: newMessageData.attachments || [],
                status: 'sent'
             };

             setConversations(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                const existingIdx = safePrev.findIndex(c => c.id === newMessage.conversation_id);
                if (existingIdx === -1) {
                  refreshData();
                  return safePrev;
                }
                const updatedConv = {
                  ...safePrev[existingIdx],
                  last_message: newMessage.content,
                  last_message_at: newMessage.created_at
                };
                const newConvs = [...safePrev];
                newConvs.splice(existingIdx, 1);
                return [updatedConv, ...newConvs];
             });

             const currentParams = new URLSearchParams(window.location.search);
             const currentActiveId = currentParams.get('id');

             if (newMessage.conversation_id === currentActiveId) {
                 setActiveMessages(prev => {
                     // Check for duplicates via ID
                     if (prev.some(m => m.id === newMessage.id)) return prev;

                     if (isMeSender) {
                        // Optimistic Deduplication
                        const optimisticMatchIndex = prev.findIndex(m =>
                           (m.status === 'pending' || m.status === 'sent') &&
                           m.tempId &&
                           m.content === newMessage.content
                        );

                        if (optimisticMatchIndex !== -1) {
                           const newArr = [...prev];
                           newArr[optimisticMatchIndex] = newMessage; // Replace with real one
                           return newArr;
                        }
                     }

                     return [...prev, newMessage];
                 });

                 if (!isMeSender) {
                   handleMarkAsRead(newMessage.conversation_id);
                 }
             } else {
                if (!isMeSender) {
                    setUnreadCounts(prev => ({
                      ...prev,
                      [newMessage.conversation_id]: (prev[newMessage.conversation_id] || 0) + 1
                   }));
                   toast.info("Nuovo messaggio ricevuto");
                }
             }
          } else if (payload.eventType === 'UPDATE') {
              const updatedMessageData = payload.new as any;
              if (updatedMessageData.is_read) {
                 setActiveMessages(prev => prev.map(m =>
                    m.id === updatedMessageData.id ? { ...m, is_read: true } : m
                 ));
              }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => { refreshData(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.user?.id, refreshData, handleMarkAsRead]);

  return {
    conversations,
    unreadCounts,
    activeConversationId,
    activeMessages,
    setActiveConversationId,
    isLoading,
    isMessagesLoading,
    refreshData,
    sendMessage
  };
};
