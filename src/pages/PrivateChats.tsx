
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserPrivateChats, fetchPrivateMessages } from "@/lib/private-messaging-utils";
import { PrivateChat, PrivateMessage } from "@/types/networking";
import { MessageSquare, User, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/LoadingScreen";
import { PrivateMessageList } from "@/components/messaging/PrivateMessageList";

interface ChatSummary extends PrivateChat {
  lastMessage: PrivateMessage | null;
  unreadCount: number;
  otherParticipant: {
    id: string;
    name: string;
    photo?: string;
  };
}

export default function PrivateChats() {
  const { chatId } = useParams<{ chatId?: string }>();
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedChat, setSelectedChat] = useState<PrivateChat | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadChats = async () => {
      if (!authState.user) return;

      try {
        setIsLoading(true);
        const privateChats = await fetchUserPrivateChats();
        
        // Per ogni chat, recupera l'ultimo messaggio e il conteggio non letti
        const chatsWithSummary: ChatSummary[] = await Promise.all(
          privateChats.map(async (chat) => {
            // Determina l'altro partecipante
            const otherParticipant = chat.participant_1_id === authState.user!.id 
              ? chat.participant_2 
              : chat.participant_1;

            // Recupera l'ultimo messaggio
            const messages = await fetchPrivateMessages(chat.id);
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            
            // Conta i messaggi non letti (non inviati dall'utente corrente)
            const unreadCount = messages.filter(
              msg => !msg.is_read && msg.sender_id !== authState.user!.id
            ).length;

            return {
              ...chat,
              lastMessage,
              unreadCount,
              otherParticipant: {
                id: otherParticipant?.id || "",
                name: `${otherParticipant?.first_name || ""} ${otherParticipant?.last_name || ""}`.trim(),
                photo: otherParticipant?.profile_photo_url
              }
            };
          })
        );

        // Ordina per ultimo messaggio
        chatsWithSummary.sort((a, b) => {
          const aTime = a.lastMessage?.created_at || a.created_at || "";
          const bTime = b.lastMessage?.created_at || b.created_at || "";
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        setChats(chatsWithSummary);

        // Se c'è un chatId nell'URL, trova e seleziona quella chat
        if (chatId) {
          const selectedChatData = chatsWithSummary.find(c => c.id === chatId);
          if (selectedChatData) {
            setSelectedChat(selectedChatData);
          }
        }

      } catch (error) {
        console.error("Error loading private chats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChats();
  }, [authState.user, chatId]);

  const formatLastMessageTime = (message: PrivateMessage | null) => {
    if (!message) return "";
    return format(new Date(message.created_at), "HH:mm", { locale: it });
  };

  const getMessagePreview = (message: PrivateMessage | null) => {
    if (!message) return "Nessun messaggio";
    if (message.content) return message.content.substring(0, 50) + (message.content.length > 50 ? "..." : "");
    if (message.attachments && message.attachments.length > 0) return "📎 Allegato";
    return "Messaggio";
  };

  const handleChatSelect = (chat: PrivateChat) => {
    setSelectedChat(chat);
    navigate(`/private-chats/${chat.id}`);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    navigate('/private-chats');
  };

  if (authState.isLoading || isLoading) {
    return <LoadingScreen />;
  }

  // Vista mobile: mostra solo la chat selezionata se ce n'è una
  if (selectedChat && window.innerWidth < 768) {
    const chatSummary = chats.find(c => c.id === selectedChat.id);
    
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="bg-white border-b p-4 flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBackToList}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <Avatar className="w-10 h-10">
            <AvatarImage src={chatSummary?.otherParticipant.photo || undefined} />
            <AvatarFallback>
              <User className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-gray-900 truncate">
              {chatSummary?.otherParticipant.name || "Chat Privata"}
            </h1>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <PrivateMessageList chatId={selectedChat.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Lista chat (sidebar su desktop, full width su mobile) */}
      <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 bg-white border-r`}>
        {/* Header */}
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold text-gray-900">Chat Private</h1>
          <p className="text-sm text-gray-600">Le tue conversazioni private</p>
        </div>

        {/* Lista chat */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nessuna chat privata
              </h3>
              <p className="text-gray-600 text-center">
                Le tue chat private appariranno qui. Inizia una conversazione dal profilo di un utente.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                  onClick={() => handleChatSelect(chat)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={chat.otherParticipant.photo || undefined} />
                      <AvatarFallback>
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {chat.otherParticipant.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {chat.lastMessage && (
                            <span className="text-xs text-gray-500">
                              {formatLastMessageTime(chat.lastMessage)}
                            </span>
                          )}
                          {chat.unreadCount > 0 && (
                            <div className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {chat.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {getMessagePreview(chat.lastMessage)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Area chat (solo su desktop) */}
      <div className="hidden md:flex flex-1 flex-col">
        {selectedChat ? (
          <>
            <div className="bg-white border-b p-4 flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={chats.find(c => c.id === selectedChat.id)?.otherParticipant.photo || undefined} />
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-gray-900 truncate">
                  {chats.find(c => c.id === selectedChat.id)?.otherParticipant.name || "Chat Privata"}
                </h1>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <PrivateMessageList chatId={selectedChat.id} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Seleziona una chat
              </h3>
              <p className="text-gray-600">
                Scegli una conversazione dalla lista per iniziare a chattare
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
