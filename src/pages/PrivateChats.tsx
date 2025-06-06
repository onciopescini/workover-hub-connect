
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { 
  fetchPrivateMessages, 
  sendPrivateMessage,
  fetchUserPrivateChats
} from "@/lib/private-messaging-utils";
import { PrivateChat, PrivateMessage } from "@/types/networking";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

const PrivateChats = () => {
  const { chatId } = useParams();
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [chat, setChat] = useState<PrivateChat | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (chatId && authState.user?.id) {
      loadChatData();
    }
  }, [chatId, authState.user?.id]);

  const loadChatData = async () => {
    if (!chatId) return;

    try {
      // Get user's chats to find the specific one
      const userChats = await fetchUserPrivateChats();
      const currentChat = userChats.find(c => c.id === chatId);
      
      if (currentChat) {
        setChat(currentChat);
        
        // Load messages
        const chatMessages = await fetchPrivateMessages(chatId);
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error("Error loading chat:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatId || !authState.user?.id) return;
    
    setIsLoading(true);
    try {
      const message = await sendPrivateMessage(chatId, newMessage.trim());
      if (message) {
        setMessages(prev => [...prev, message]);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getOtherParticipant = () => {
    if (!chat || !authState.user?.id) return null;
    
    return chat.participant_1_id === authState.user.id 
      ? chat.participant_2 
      : chat.participant_1;
  };

  const otherParticipant = getOtherParticipant();

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Accedi per chattare
            </h3>
            <p className="text-gray-600">
              Devi effettuare l'accesso per utilizzare la chat privata.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!chat || !otherParticipant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Chat non trovata
            </h3>
            <p className="text-gray-600 mb-4">
              La chat richiesta non esiste o non è accessibile.
            </p>
            <Button onClick={() => navigate('/messages')}>
              Torna ai messaggi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/messages')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna ai messaggi
        </Button>
      </div>

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={otherParticipant.profile_photo_url || ""} />
              <AvatarFallback>
                {otherParticipant.first_name?.charAt(0)}
                {otherParticipant.last_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {otherParticipant.first_name} {otherParticipant.last_name}
              </CardTitle>
              <p className="text-sm text-gray-600">Chat privata</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nessun messaggio ancora</p>
                <p className="text-sm">Inizia la conversazione!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === authState.user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_id === authState.user?.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p>{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === authState.user?.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                          locale: it
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Scrivi un messaggio..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!newMessage.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivateChats;
