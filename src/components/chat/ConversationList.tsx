import React from 'react';
import { Conversation, ChatParticipant } from '@/types/chat';
import { User } from '@supabase/supabase-js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';

interface ConversationListProps {
  conversations: Conversation[];
  currentUser: User | null;
  isLoading: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({ conversations, currentUser, isLoading }) => {
  const navigate = useNavigate();
  const { id: activeId } = useParams();

  if (isLoading) {
    return <div className="p-4 text-muted-foreground text-sm">Caricamento conversazioni...</div>;
  }

  if (conversations.length === 0) {
    return <div className="p-4 text-muted-foreground text-sm">Nessuna conversazione attiva.</div>;
  }

  const getOtherParticipant = (participants: ChatParticipant[]) => {
    if (!currentUser) return participants[0];
    const other = participants.find(p => p.id !== currentUser.id);
    return other || participants[0];
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((convo) => {
        const otherPerson = getOtherParticipant(convo.participants);
        const isActive = activeId === convo.id;

        // Safety check for display name
        const displayName = otherPerson
          ? `${otherPerson.first_name || ''} ${otherPerson.last_name || ''}`.trim() || otherPerson.email || 'Utente'
          : 'Utente Sconosciuto';

        return (
          <div
            key={convo.id}
            onClick={() => navigate(`/messages/${convo.id}`)}
            className={cn(
              "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted transition-colors border-b",
              isActive && "bg-muted"
            )}
          >
            <Avatar>
              <AvatarImage src={otherPerson?.profile_photo_url || otherPerson?.avatar_url || ''} />
              <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-medium truncate text-sm">{displayName}</span>
                {convo.updated_at && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(convo.updated_at), { addSuffix: true, locale: it })}
                  </span>
                )}
              </div>
              <p className={cn("text-xs truncate", isActive ? "text-foreground" : "text-muted-foreground")}>
                {convo.last_message?.content || ''}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
