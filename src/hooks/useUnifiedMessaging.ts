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

  // Helper to mark read and update local state
  // STABILIZED: depends only on user ID
  const handleMarkAsRead = useCallback(async (conversationId: string) => {
    if (!authState.user?.id) return;

    // Call backend to update DB
    // We catch errors here to prevent unhandled promise rejections
    try {
       await markConversationAsRead(conversationId, authState.user.id);

       // Update local state immediately
       setUnreadCounts(prev => {
         const newCounts = { ...prev };
         delete newCounts[conversationId];
         return newCounts;
       });
    } catch (e) {
       console.error("Failed to mark conversation as read", e);
    }
  }, [authState.user?.id]);

  // Load messages for active conversation and mark as read
  // STABILIZED: This effect handles "View Change" only.
  useEffect(() => {
    if (activeConversationId) {
      // Fetch messages
      fetchConversationMessages(activeConversationId)
        .then(setActiveMessages)
        .catch(err => console.error("Error loading messages", err));

      // Mark as read when opening conversation
      handleMarkAsRead(activeConversationId);
    } else {
      setActiveMessages([]);
    }
  }, [activeConversationId, handleMarkAsRead]);

  const setActiveConversationId = useCallback((id: string | null) => {
    if (id) {
      setSearchParams({ id });
    } else {
      setSearchParams({});
    }
  }, [setSearchParams]);

  // STABILIZED: refreshData depends only on user ID.
  const refreshData = useCallback(async () => {
    if (!authState.user?.id) return;
    try {
      const [convs, unreads] = await Promise.all([
        fetchConversations(authState.user.id),
        fetchUnreadCounts(authState.user.id)
      ]);
      setConversations(convs || []); // Ensure array
      setUnreadCounts(unreads || {}); // Ensure object
    } catch (error) {
      console.error("Error fetching messaging data:", error);
      toast.error("Impossibile caricare i messaggi");
    } finally {
      setIsLoading(false);
    }
  }, [authState.user?.id]);

  // Initial Data Load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Realtime Subscription
  // STABILIZED: Removed `activeConversationId` from dependencies.
  // The subscription is now global for the user and persistent across navigation within the component.
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
          if (payload.eventType === 'INSERT') {
             const newMessage = payload.new as any;
             const isMeSender = newMessage.sender_id === authState.user?.id;

             // Update conversations list order/content
             setConversations(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                const existingIdx = safePrev.findIndex(c => c.id === newMessage.conversation_id);
                if (existingIdx === -1) {
                  // New conversation? Refresh entire list to get details
                  refreshData();
                  return safePrev;
                }

                const updatedConv = {
                  ...safePrev[existingIdx],
                  last_message: newMessage.content,
                  last_message_at: newMessage.created_at
                };

                // Move to top
                const newConvs = [...safePrev];
                newConvs.splice(existingIdx, 1);
                return [updatedConv, ...newConvs];
             });

             // Update active messages if relevant
             // We use a functional update to access the *current* active messages without depending on activeConversationId
             setActiveMessages(prev => {
                 const safePrev = Array.isArray(prev) ? prev : [];
                 // We can't easily check activeConversationId here because it's not in dependency array.
                 // However, we can check if the message belongs to the conversation of the currently displayed messages.
                 // Or we can rely on the fact that if setActiveMessages is called, the user is looking at *some* conversation.

                 // Better approach: Check URL params directly if needed, or better yet, check if the message conversation_id
                 // matches the id of the first message in the list (heuristic) or just append if it looks right.
                 // Actually, we can use `activeConversationId` from the closure IF we add it to deps, but we want to avoid that.

                 // Solution: We rely on `searchParams.get('id')` which is accessible via closure?
                 // No, searchParams changes.

                 // If we simply update activeMessages only if the conversation ID matches the currently loaded messages...
                 // But we don't store conversation ID in `activeMessages` array usually (it's in the message object).
                 if (safePrev.length > 0 && safePrev[0].conversation_id === newMessage.conversation_id) {
                     if (safePrev.some(m => m.id === newMessage.id)) return safePrev;
                     return [...safePrev, newMessage];
                 } else if (safePrev.length === 0) {
                     // If empty, we can't be sure without checking the URL.
                     // But if it's empty, maybe we just started the convo.
                     // It is safer to re-fetch or let `activeConversationId` effect handle it if it triggers.
                     // But for Realtime, we want instant update.
                     return safePrev;
                 }
                 return safePrev;
             });

             // NOTE: We need to handle "Mark as Read" and "Unread Count" without `activeConversationId` dependency.
             // We can use a ref or check window location.
             const currentParams = new URLSearchParams(window.location.search);
             const currentActiveId = currentParams.get('id');

             if (newMessage.conversation_id === currentActiveId) {
                // If I am receiving a message in the ACTIVE conversation
                 if (!isMeSender) {
                   handleMarkAsRead(newMessage.conversation_id);

                   // Also force update activeMessages if it was empty (first message case)
                   setActiveMessages(prev => {
                       const safePrev = Array.isArray(prev) ? prev : [];
                       if (safePrev.length === 0) return [newMessage];
                       return safePrev;
                   });
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
           refreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.user?.id, refreshData, handleMarkAsRead]); // Removed activeConversationId

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
