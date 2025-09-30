import { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getUserPrivateChats, getPrivateMessages, sendPrivateMessage, sendMessage, fetchMessages as fetchBookingMessages } from "@/lib/messaging-utils";
import { ConversationItem } from "@/types/messaging";
import { isValidMessageWithSender } from "@/types/strict-type-guards";
import { sreLogger } from '@/lib/sre-logger';

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

  const isHost = authState.profile?.role === 'host' || authState.profile?.role === 'admin';

  // Fetch conversations based on active tab and user role
  useEffect(() => {
    const fetchConversations = async () => {
      if (!authState.user?.id) return;

      setIsLoading(true);
      try {
        if (activeTab === "all" || activeTab === "bookings") {
          let bookings: any[] = [];

          if (isHost) {
            // Host: fetch bookings for spaces they own
            const { data: hostBookings, error } = await supabase
              .from("bookings")
              .select(`
                *,
                space:spaces!inner (
                  id,
                  title,
                  host_id
                ),
                coworker:profiles!user_id (
                  id,
                  first_name,
                  last_name,
                  profile_photo_url
                )
              `)
              .eq("space.host_id", authState.user.id)
              .eq("status", "confirmed")
              .gte("booking_date", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
              .order("created_at", { ascending: false });

            if (!error && hostBookings) {
              bookings = hostBookings;
            }
          } else {
            // Coworker: fetch their own bookings
            const { data: coworkerBookings, error } = await supabase
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

            if (!error && coworkerBookings) {
              bookings = coworkerBookings;
            }
          }

          if (bookings) {
            const bookingConversations = await Promise.all(bookings.map(async booking => {
              let title: string;
              let avatar: string;
              
              if (isHost) {
                // For hosts: show coworker name
                const coworkerName = booking.coworker ? 
                  `${booking.coworker.first_name} ${booking.coworker.last_name}`.trim() : 
                  'Coworker';
                const spaceTitle = booking.space?.title || 'Spazio';
                title = `${coworkerName} - ${spaceTitle}`;
                avatar = booking.coworker?.profile_photo_url ?? '';
              } else {
                // For coworkers: show host name
                const hostName = booking.space?.host ? 
                  `${booking.space.host.first_name} ${booking.space.host.last_name}`.trim() : 
                  'Host';
                const spaceTitle = booking.space?.title || 'Spazio';
                title = `${spaceTitle} (${hostName})`;
                avatar = booking.space?.host?.profile_photo_url ?? '';
              }

              const bookingDate = new Date(booking.booking_date).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });

              // Get last message time and unread count with proper error handling
              const { data: lastMessage, error: lastMsgError } = await supabase
                .from('messages')
                .select('created_at')
                .eq('booking_id', booking.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (lastMsgError) {
                sreLogger.warn('Error fetching last message for booking', { bookingId: booking.id }, lastMsgError);
              }

              const { data: unreadMessages, error: unreadError } = await supabase
                .from('messages')
                .select('id')
                .eq('booking_id', booking.id)
                .neq('sender_id', authState.user?.id || '')
                .eq('is_read', false);

              if (unreadError) {
                sreLogger.warn('Error fetching unread messages for booking', { bookingId: booking.id }, unreadError);
              }
              
              return {
                id: `booking-${booking.id}`,
                type: 'booking' as const,
                title,
                subtitle: `Prenotazione del ${bookingDate}`,
                avatar,
                status: booking.status as 'confirmed' | 'pending' | 'cancelled',
                lastMessageTime: lastMessage?.created_at || booking.updated_at || '',
                unreadCount: unreadMessages?.length || 0,
                businessContext: {
                  type: 'booking' as const,
                  details: booking.space?.title
                }
              };
            }));

            // Sort by last message time
            bookingConversations.sort((a, b) => 
              new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
            );
            
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
              avatar: otherParticipant?.profile_photo_url ?? '',
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
        sreLogger.error("Error fetching conversations", {}, error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [activeTab, authState.user?.id]);

  // Fetch messages for selected conversation with real-time updates
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversationId) return;

      try {
        // Correctly parse type and full UUID (UUIDs contain hyphens!)
        const parts = selectedConversationId.split('-');
        const type = parts[0];
        const id = parts.slice(1).join('-');
        
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
          sreLogger.error('Invalid UUID format', { id, conversationId: selectedConversationId });
          return;
        }
        
        let fetchedMessages: Array<Record<string, unknown>> = [];

        if (type === 'booking') {
          sreLogger.debug('Fetching booking messages', { id });
          const bookingMessages = await fetchBookingMessages(id);
          fetchedMessages = bookingMessages.map(msg => ({ ...msg } as Record<string, unknown>));
        } else if (type === 'private') {
          sreLogger.debug('Fetching private messages', { id });
          const privateMessages = await getPrivateMessages(id);
          fetchedMessages = privateMessages.map(msg => ({ ...msg } as Record<string, unknown>));
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
        sreLogger.error("Error fetching messages for conversation", { conversationId: selectedConversationId }, error as Error);
        setMessages([]);
      }
    };

    if (!selectedConversationId) {
      return;
    }

    fetchMessages();

    // Set up real-time subscription for messages
    const parts = selectedConversationId.split('-');
    const type = parts[0];
    const id = parts.slice(1).join('-');
    
    const tableName = type === 'booking' ? 'messages' : 'private_messages';
    const filterField = type === 'booking' ? 'booking_id' : 'chat_id';

    const channel = supabase
      .channel(`${type}-messages-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `${filterField}=eq.${id}`
        },
        () => {
          fetchMessages(); // Refetch when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId, authState.user?.id]);

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!selectedConversationId) {
      sreLogger.warn('No conversation selected');
      return;
    }

    const parts = selectedConversationId.split('-');
    const type = parts[0];
    const id = parts.slice(1).join('-');
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      sreLogger.error('Invalid UUID format when sending message', { id });
      throw new Error('Invalid conversation ID format');
    }
    
    try {
      sreLogger.debug(`Sending ${type} message`, { id });
      
      if (type === 'private') {
        await sendPrivateMessage(id, content);
      } else if (type === 'booking') {
        await sendMessage(id, content);
      }
      
      // Refresh messages would trigger the useEffect above
    } catch (error) {
      sreLogger.error(`Error sending ${type} message`, { type }, error as Error);
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