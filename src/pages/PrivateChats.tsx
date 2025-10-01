
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Plus, Search, Users, Clock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import { sreLogger } from "@/lib/sre-logger";
import { 
  getUserPrivateChats,
  getPrivateMessages, 
  sendPrivateMessage,
  PrivateChat,
  PrivateMessage 
} from "@/lib/messaging-utils";

const PrivateChats = () => {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const { authState } = useAuth();
  const [chats, setChats] = useState<PrivateChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<PrivateChat | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (chatId) {
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        setSelectedChat(chat);
        loadMessages(chatId);
      }
    }
  }, [chatId, chats]);

  const loadChats = async () => {
    try {
      const userChats = await getUserPrivateChats();
      setChats(userChats);
    } catch (error) {
      sreLogger.error("Failed to load chats", { userId: authState.user?.id }, error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const chatMessages = await getPrivateMessages(chatId);
      setMessages(chatMessages);
    } catch (error) {
      sreLogger.error("Failed to load messages", { chatId }, error as Error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    const success = await sendPrivateMessage(selectedChat.id, newMessage.trim());
    if (success) {
      setNewMessage("");
      await loadMessages(selectedChat.id);
    }
  };

  const handleChatSelect = (chat: PrivateChat) => {
    navigate(`/private-chats/${chat.id}`);
  };

  const getOtherParticipant = (chat: PrivateChat) => {
    if (chat.participant_1_id === authState.user?.id) {
      return chat.participant_2;
    }
    return chat.participant_1;
  };

  const getUserInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Caricamento chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex">
        {/* Chat List Sidebar */}
        <div className="w-1/3 bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-4 mb-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/networking")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold">Chat Private</h1>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Cerca chat..." className="pl-10" />
            </div>
          </div>
          
          <div className="overflow-y-auto h-[calc(100vh-120px)]">
            {chats.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nessuna chat
                </h3>
                <p className="text-gray-600">
                  Le tue conversazioni private appariranno qui
                </p>
              </div>
            ) : (
              chats.map((chat) => {
                const otherUser = getOtherParticipant(chat);
                const isSelected = selectedChat?.id === chat.id;
                
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleChatSelect(chat)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={otherUser?.profile_photo_url || ""} />
                        <AvatarFallback>
                          {getUserInitials(otherUser?.first_name, otherUser?.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {otherUser?.first_name} {otherUser?.last_name}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">
                          Ultimo messaggio: {new Date(chat.last_message_at).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-white p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getOtherParticipant(selectedChat)?.profile_photo_url || ""} />
                    <AvatarFallback>
                      {getUserInitials(
                        getOtherParticipant(selectedChat)?.first_name,
                        getOtherParticipant(selectedChat)?.last_name
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {getOtherParticipant(selectedChat)?.first_name} {getOtherParticipant(selectedChat)?.last_name}
                    </h2>
                    <p className="text-sm text-gray-600">Chat privata</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Nessun messaggio ancora. Inizia la conversazione!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender_id === authState.user?.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isOwnMessage
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p>{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.created_at).toLocaleTimeString('it-IT', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <div className="bg-white p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Scrivi un messaggio..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Seleziona una chat
                </h3>
                <p className="text-gray-600">
                  Scegli una conversazione dalla lista per iniziare a messaggiare
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivateChats;
