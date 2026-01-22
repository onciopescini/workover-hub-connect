import React, { useState } from 'react';
import { Message, ChatParticipant, Conversation } from '@/types/chat';
import { User } from '@supabase/supabase-js';
import { MessageBubble } from './MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

interface ChatWindowProps {
  messages: Message[];
  currentUser: User | null;
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  activeConversation?: Conversation;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  currentUser,
  isLoading,
  onSendMessage,
  messagesEndRef,
  activeConversation
}) => {
  const [inputValue, setInputValue] = useState("");
  const navigate = useNavigate();

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue("");
  };

  const getOtherParticipant = (participants: ChatParticipant[]) => {
    if (!currentUser) return participants[0];
    return participants.find(p => p.id !== currentUser.id);
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground h-full">
        Seleziona una conversazione per iniziare
      </div>
    );
  }

  const otherPerson = getOtherParticipant(activeConversation.participants);
  const displayName = otherPerson
      ? `${otherPerson.first_name || ''} ${otherPerson.last_name || ''}`.trim() || otherPerson.email || 'Utente'
      : 'Utente';

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden -ml-2"
          onClick={() => navigate('/messages')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Avatar className="h-8 w-8">
          <AvatarImage src={otherPerson?.profile_photo_url || otherPerson?.avatar_url || ''} />
          <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="font-semibold text-sm">
          {displayName}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-muted/5">
        {isLoading ? (
           <div className="flex justify-center py-8">
             <span className="loading loading-spinner loading-sm text-muted-foreground"></span>
           </div>
        ) : (
          <>
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm mt-8">
                Nessun messaggio. Scrivi qualcosa per iniziare!
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isMe={msg.sender_id === currentUser?.id}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Footer / Input */}
      <div className="p-4 bg-background border-t">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Scrivi un messaggio..."
            className="flex-1"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={!inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
