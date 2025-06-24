
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Calendar, Users, Plus, Settings, Search } from "lucide-react";
import { ConversationSidebar } from "@/components/messaging/ConversationSidebar";
import { EnhancedMessageComposer } from "@/components/messaging/EnhancedMessageComposer";
import { EnhancedMessageBubble } from "@/components/messaging/EnhancedMessageBubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { getUserPrivateChats, getPrivateMessages, sendPrivateMessage } from "@/lib/messaging-utils";
import { fetchBookingMessages } from "@/lib/message-utils";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

const Messages = () => {
  const { authState } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
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
            .in("status", ["confirmed", "pending"])
            .order("created_at", { ascending: false });

          if (!error && bookings) {
            const bookingConversations = bookings.map(booking => ({
              id: `booking-${booking.id}`,
              type: 'booking',
              title: booking.space?.host ? 
                `${booking.space.host.first_name} ${booking.space.host.last_name}` : 
                'Host',
              subtitle: booking.space?.title || 'Spazio',
              avatar: booking.space?.host?.profile_photo_url,
              status: booking.status,
              lastMessageTime: booking.updated_at,
              businessContext: {
                type: 'booking',
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
              type: 'private',
              title: otherParticipant ? 
                `${otherParticipant.first_name} ${otherParticipant.last_name}` : 
                'Utente',
              subtitle: 'Chat privata',
              avatar: otherParticipant?.profile_photo_url,
              lastMessageTime: chat.last_message_at,
              isOnline: Math.random() > 0.5 // Mock online status
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
        let fetchedMessages: any[] = [];

        if (type === 'booking') {
          fetchedMessages = await fetchBookingMessages(id);
        } else if (type === 'private') {
          fetchedMessages = await getPrivateMessages(id);
        }

        setMessages(fetchedMessages.map(msg => ({
          ...msg,
          senderName: msg.sender ? 
            `${msg.sender.first_name} ${msg.sender.last_name}` : 
            'Unknown',
          senderAvatar: msg.sender?.profile_photo_url,
          isCurrentUser: msg.sender_id === authState.user?.id
        })));
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
      
      // Refresh messages
      // This would trigger the useEffect above
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

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Accedi per vedere i messaggi
            </h3>
            <p className="text-gray-600">
              Devi effettuare l'accesso per visualizzare e inviare messaggi.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Centro Messaggi</h1>
              <p className="text-gray-600">
                Gestisci tutte le tue conversazioni di prenotazioni e networking
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuova Chat
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="all" className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Tutti
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {getTabCount("all")}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="bookings" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Prenotazioni
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {getTabCount("bookings")}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="private" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Private
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {getTabCount("private")}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="h-full mt-0">
                <ConversationSidebar
                  conversations={filteredConversations}
                  selectedId={selectedConversationId}
                  onSelect={setSelectedConversationId}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-3">
            <Card className="h-full flex flex-col">
              {selectedConversationId ? (
                <>
                  {/* Chat Header */}
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {filteredConversations.find(c => c.id === selectedConversationId)?.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {filteredConversations.find(c => c.id === selectedConversationId)?.subtitle}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {filteredConversations.find(c => c.id === selectedConversationId)?.type}
                        </Badge>
                        <Button variant="ghost" size="icon">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>

                  {/* Messages */}
                  <CardContent className="flex-1 p-0">
                    <ScrollArea className="h-96 p-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">Nessun messaggio</p>
                          <p>Inizia la conversazione!</p>
                        </div>
                      ) : (
                        <div>
                          {messages.map((message) => (
                            <EnhancedMessageBubble
                              key={message.id}
                              id={message.id}
                              content={message.content}
                              attachments={message.attachments?.map((url: string) => ({
                                url,
                                type: url.includes('.jpg') || url.includes('.png') ? 'image' as const : 'file' as const,
                                name: url.split('/').pop() || 'file'
                              }))}
                              senderName={message.senderName}
                              senderAvatar={message.senderAvatar}
                              timestamp={message.created_at}
                              isCurrentUser={message.isCurrentUser}
                              isRead={message.is_read}
                              businessContext={
                                selectedConversationId.startsWith('booking-') ? {
                                  type: 'booking',
                                  details: filteredConversations.find(c => c.id === selectedConversationId)?.subtitle
                                } : undefined
                              }
                            />
                          ))}
                        </div>
                      )}
                    </ScrollArea>

                    {/* Message Composer */}
                    <EnhancedMessageComposer
                      onSend={handleSendMessage}
                      placeholder="Scrivi un messaggio..."
                    />
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Seleziona una conversazione</p>
                    <p>Scegli una chat per iniziare a comunicare</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
