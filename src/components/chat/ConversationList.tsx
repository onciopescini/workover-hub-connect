import React, { useState } from 'react';
import { Conversation, ChatParticipant, ConversationType } from '@/types/chat';
import { User } from '@supabase/supabase-js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';
import { ConversationTypeBadge } from './ConversationTypeBadge';
import { Button } from '@/components/ui/button';
import { Archive, Inbox, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query-config';
import { toast } from 'sonner';

interface ConversationListProps {
  conversations: Conversation[];
  currentUser: User | null;
  isLoading: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({ conversations, currentUser, isLoading }) => {
  const navigate = useNavigate();
  const { id: activeId } = useParams();
  const [showArchived, setShowArchived] = useState(false);
  const queryClient = useQueryClient();

  const handleRestoreConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    const { error } = await supabase
      .from('conversation_participants')
      .update({ archived_at: null })
      .eq('conversation_id', conversationId)
      .eq('user_id', currentUser.id);

    if (error) {
      toast.error('Errore nel ripristino della conversazione');
      return;
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations() });
    toast.success('Conversazione ripristinata');
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground text-sm">Caricamento conversazioni...</div>;
  }

  // Filter based on archived state
  const filteredConversations = conversations.filter(c => 
    showArchived ? c.archived_at : !c.archived_at
  );

  if (filteredConversations.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-3 border-b">
          <Button
            variant={showArchived ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="gap-1.5"
          >
            {showArchived ? <Inbox className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {showArchived ? "Attive" : "Archiviate"}
          </Button>
        </div>
        <div className="p-4 text-muted-foreground text-sm">
          {showArchived 
            ? "Nessuna conversazione archiviata." 
            : "Nessuna conversazione attiva."}
        </div>
      </div>
    );
  }

  const getOtherParticipant = (participants: ChatParticipant[]) => {
    if (!currentUser) return participants[0];
    const other = participants.find(p => p.id !== currentUser.id);
    return other || participants[0];
  };

  const getConversationType = (convo: Conversation): ConversationType => {
    if (convo.type) return convo.type;
    return convo.booking_id ? 'booking' : 'private';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toggle for archived */}
      <div className="flex items-center justify-between p-3 border-b shrink-0">
        <span className="text-sm font-medium">
          {showArchived ? "Archiviate" : "Conversazioni"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className="gap-1.5 h-8"
        >
          {showArchived ? <Inbox className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          <span className="text-xs">{showArchived ? "Attive" : "Archiviate"}</span>
        </Button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.map((convo) => {
          const otherPerson = getOtherParticipant(convo.participants);
          const isActive = activeId === convo.id;
          const conversationType = getConversationType(convo);

          // Safety check for display name
          const displayName = otherPerson
            ? `${otherPerson.first_name || ''} ${otherPerson.last_name || ''}`.trim() || 'Utente'
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
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate text-sm">{displayName}</span>
                    <ConversationTypeBadge type={conversationType} />
                  </div>
                  {convo.updated_at && (
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(new Date(convo.updated_at), { addSuffix: true, locale: it })}
                    </span>
                  )}
                </div>
                <p className={cn("text-xs truncate", isActive ? "text-foreground" : "text-muted-foreground")}>
                  {convo.last_message?.content || ''}
                </p>
              </div>
              
              {/* Restore button for archived conversations */}
              {showArchived && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  onClick={(e) => handleRestoreConversation(convo.id, e)}
                  title="Ripristina conversazione"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
