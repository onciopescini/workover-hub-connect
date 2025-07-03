import { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getUserPrivateChats, getPrivateMessages, sendPrivateMessage } from "@/lib/messaging-utils";
import { fetchBookingMessages } from "@/lib/message-utils";
import { ConversationItem } from "@/types/messaging";
import { isValidMessageWithSender } from "@/types/strict-type-guards";

interface PrivateMessage {
  sender?: { first_name: string; last_name: string; profile_photo_url?: string };
  sender_id: string;
  [key: string]: unknown;
}

export const useMessagesData = (activeTab: string) => {
  const { authState } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch conversations based on active tab
  useEffect(() => {
    const fetchConversations = async () => {
      if (!authState.user?.id) return;

      setIsLoading(true);
      try {
        if (activeTab === "all" || activeTab === "bookings") {
          // Fetch booking conversations
          const { data: bookings, error } = await supabase
            .from("bookings")
            .select(`
              *,
              space:spaces (
                id,
                title,
                host_id,
                host:profiles!host_id (
                  id,
                  first_name,
                  last_name,
                  profile_photo_url
                )
              )
            `)
            .eq("user_id", authState.user.id)
            .in("status", ["confirmed", "pending", "cancelled"])
            .order("created_at", { ascending: false });

          if (!error && bookings) {
            const bookingConversations = bookings.map(booking => ({
              id: `booking-${booking.id}`,
              type: 'booking' as const,
              title: booking.space?.host ? 
                `${booking.space.host.first_name} ${booking.space.host.last_name}` : 
                'Host',
              subtitle: booking.space?.title || 'Spazio',
              avatar: booking.space?.host?.profile_photo_url,
              status: booking.status as 'confirmed' | 'pending' | 'cancelled',
              lastMessageTime: booking.updated_at,
              businessContext: {
                type: 'booking' as const,
                details: booking.space?.title
              }
            }));
            
            setConversations(prev => 
              activeTab === "all" ? 
                [...bookingConversations, ...prev.filter(c => c.type !== 'booking')] :
                bookingConversations
            );
          }
        }

        if (activeTab === "all" || activeTab === "private") {
          // Fetch private chats
          const privateChats = await getUserPrivateChats();
          const privateChatConversations = privateChats.map(chat => {
            const otherParticipant = chat.participant_1_id === authState.user?.id ? 
              chat.participant_2 : chat.participant_1;
            
            return {
              id: `private-${chat.id}`,
              type: 'private' as const,
              title: otherParticipant ? 
                `${otherParticipant.first_name} ${otherParticipant.last_name}` : 
                'Utente',
              subtitle: 'Chat privata',
              avatar: otherParticipant?.profile_photo_url,
              lastMessageTime: chat.last_message_at,
              isOnline: Math.random() > 0.5,
              status: 'active' as const
            };
          });

          setConversations(prev => 
            activeTab === "all" ? 
              [...prev.filter(c => c.type !== 'private'), ...privateChatConversations] :
              privateChatConversations
          );
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [activeTab, authState.user?.id]);

  // Fetch messages for selected conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversationId) return;

      try {
        const [type, id] = selectedConversationId.split('-');
        let fetchedMessages: Array<Record<string, unknown>> = [];

        if (type === 'booking') {
          fetchedMessages = await fetchBookingMessages(id);
        } else if (type === 'private') {
          fetchedMessages = await getPrivateMessages(id) as unknown as PrivateMessage[];
        }

        setMessages(fetchedMessages.map(msg => {
          const msgData = msg as any;
          const sender = msgData.sender as any;
          return {
            ...msg,
            senderName: sender ? 
              `${sender.first_name as string} ${sender.last_name as string}` : 
              'Unknown',
            senderAvatar: sender?.profile_photo_url as string,
            isCurrentUser: msgData.sender_id === authState.user?.id
          };
        }));
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
  }, [selectedConversationId, authState.user?.id]);

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!selectedConversationId) return;

    const [type, id] = selectedConversationId.split('-');
    
    try {
      if (type === 'private') {
        await sendPrivateMessage(id, content);
      }
      // Add booking message sending logic here
      
      // Refresh messages would trigger the useEffect above
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  const getTabCount = (tab: string) => {
    return conversations.filter(c => 
      tab === "all" ? true : c.type === tab
    ).length;
  };

  const filteredConversations = conversations.filter(c => {
    if (activeTab === "all") return true;
    if (activeTab === "bookings") return c.type === "booking";
    if (activeTab === "private") return c.type === "private";
    return true;
  });

  return {
    selectedConversationId,
    setSelectedConversationId,
    conversations: filteredConversations,
    messages,
    isLoading,
    handleSendMessage,
    getTabCount
  };
};
