import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { sendMessageToConversation, fetchConversationMessages } from '@/lib/conversations';
import { useAuth } from '@/hooks/auth/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  } | null;
}

interface Conversation {
  id: string;
  host_id: string;
  coworker_id: string;
  space_id?: string | null;
  booking_id?: string | null;
  host?: { first_name: string; last_name: string } | null;
  coworker?: { first_name: string; last_name: string } | null;
  space?: { title: string } | null;
}

export default function ChatThread() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversation details and messages
  useEffect(() => {
    if (!conversationId || !authState.user?.id) return;
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load conversation details
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select(`
            *,
            host:profiles!conversations_host_id_fkey(id, first_name, last_name, profile_photo_url),
            coworker:profiles!conversations_coworker_id_fkey(id, first_name, last_name, profile_photo_url),
            space:spaces(id, title),
            booking:bookings(id, booking_date)
          `)
          .eq('id', conversationId)
          .single();

        if (convError) {
          console.error('Error loading conversation:', convError);
          toast.error('Conversazione non trovata');
          navigate('/messages');
          return;
        }

        setConversation(convData as Conversation);

        // Load messages
        const messagesData = await fetchConversationMessages(conversationId);
        setMessages(messagesData as Message[]);
      } catch (error) {
        console.error('Error loading chat data:', error);
        toast.error('Errore nel caricamento della chat');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [conversationId, authState.user?.id, navigate]);

  // Set up real-time message listener
  useEffect(() => {
    if (!conversationId) return;
    
    console.log('[ChatThread] Setting up realtime for conversation:', conversationId);
    
    const channel = supabase
      .channel(`messages:conv:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        console.log('[ChatThread] New message received:', payload.new);
        
        // Fetch sender details for the new message
        const { data: senderData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, profile_photo_url')
          .eq('id', (payload.new as any).sender_id)
          .single();

        const newMessage = {
          ...payload.new,
          sender: senderData
        } as Message;

        setMessages((prev) => [...prev, newMessage]);
      })
      .subscribe((status) => {
        console.log('[ChatThread] Realtime status:', status);
      });
    
    return () => {
      console.log('[ChatThread] Cleaning up realtime channel');
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId || !authState.user?.id || isSending) return;
    
    setIsSending(true);
    try {
      await sendMessageToConversation({ 
        conversationId, 
        content: trimmed,
        senderId: authState.user.id,
        bookingId: conversation?.booking_id || null
      });
      setText('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Errore nell\'invio del messaggio');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const getOtherParticipant = () => {
    if (!conversation || !authState.user?.id) return null;
    
    if (conversation.host_id === authState.user.id) {
      return conversation.coworker;
    } else {
      return conversation.host;
    }
  };

  const otherParticipant = getOtherParticipant();
  const chatTitle = otherParticipant 
    ? `${otherParticipant.first_name} ${otherParticipant.last_name}`
    : 'Chat';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/messages')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-lg">{chatTitle}</CardTitle>
              {conversation?.space && (
                <p className="text-sm text-muted-foreground">
                  Spazio: {conversation.space.title}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nessun messaggio ancora. Inizia la conversazione!
            </div>
          ) : (
            messages.map((message) => {
              const isMyMessage = message.sender_id === authState.user?.id;
              return (
                <div 
                  key={message.id} 
                  className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[70%] p-3 rounded-lg ${
                      isMyMessage 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}
                  >
                    <div className="break-words">{message.content}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.created_at).toLocaleString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </CardContent>

        {/* Message Input */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Scrivi un messaggio..."
              disabled={isSending}
              className="flex-1"
            />
            <Button 
              onClick={send} 
              disabled={!text.trim() || isSending}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}