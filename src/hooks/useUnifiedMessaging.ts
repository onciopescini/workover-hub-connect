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

             // Check if the message belongs to the active conversation
             const currentParams = new URLSearchParams(window.location.search);
             const currentActiveId = currentParams.get('id');

             if (newMessage.conversation_id === currentActiveId) {
                 setActiveMessages(prev => {
                     const safePrev = Array.isArray(prev) ? prev : [];
                     if (safePrev.some(m => m.id === newMessage.id)) return safePrev;
                     return [...safePrev, newMessage];
                 });

                 // If it's an incoming message, mark as read
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
