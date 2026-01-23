import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare } from "lucide-react";
import { useChat } from "@/hooks/chat/useChat";

export function RecentMessages() {
  const navigate = useNavigate();
  // We use useChat to fetch conversations.
  // We don't need a specific ID here, just the list.
  const { conversations, isLoading, currentUser } = useChat();

  const recentConversations = conversations.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Messaggi Recenti</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => navigate('/messages')}
        >
          Vedi tutti
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Caricamento...
          </div>
        ) : recentConversations.length > 0 ? (
          <div className="space-y-4">
            {recentConversations.map((conversation) => {
              const otherPerson = currentUser
                 ? (conversation.participants.find(p => p.id !== currentUser.id) || conversation.participants[0])
                 : conversation.participants[0];

              const displayName = otherPerson
                ? `${otherPerson.first_name || ''} ${otherPerson.last_name || ''}`.trim() || otherPerson.email || 'Utente'
                : 'Utente Sconosciuto';

              return (
                <div
                  key={conversation.id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                  onClick={() => navigate(`/messages/${conversation.id}`)}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={otherPerson?.profile_photo_url || otherPerson?.avatar_url || ''} />
                    <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {typeof conversation.last_message === 'string'
                        ? conversation.last_message
                        : conversation.last_message?.content || 'Nessun messaggio'}
                    </p>
                  </div>
                  {conversation.updated_at && (
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true, locale: it })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm">Nessun messaggio recente</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
