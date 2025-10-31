
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessagesUnauthenticated } from "@/components/messaging/MessagesUnauthenticated";
import { fetchConversations } from "@/lib/conversations";
import { MessageCircle, Clock } from "lucide-react";
import { toast } from 'sonner';
import { sreLogger } from '@/lib/sre-logger';

const ThreadsLayoutStitch = lazy(() => import('@/feature/messaging/ThreadsLayoutStitch'));

interface Conversation {
  id: string;
  host_id: string;
  coworker_id: string;
  space_id?: string | null;
  booking_id?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  updated_at: string;
  host?: { first_name: string; last_name: string; profile_photo_url?: string } | null;
  coworker?: { first_name: string; last_name: string; profile_photo_url?: string } | null;
  space?: { title: string } | null;
  booking?: { booking_date: string } | null;
}

const Messages = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadConversations = async () => {
      if (!authState.user?.id) return;
      
      setIsLoading(true);
      try {
        const data = await fetchConversations(authState.user.id);
        setConversations(data as unknown as Conversation[]);
      } catch (error) {
        sreLogger.error('Failed to load conversations', { userId: authState.user.id }, error as Error);
        toast.error('Errore nel caricamento delle conversazioni');
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [authState.user?.id]);

  if (!authState.isAuthenticated) {
    return <MessagesUnauthenticated />;
  }

  const getOtherParticipant = (conversation: Conversation) => {
    if (!authState.user?.id) return null;
    
    if (conversation.host_id === authState.user.id) {
      return conversation.coworker;
    } else {
      return conversation.host;
    }
  };

  const getConversationTitle = (conversation: Conversation) => {
    const otherParticipant = getOtherParticipant(conversation);
    if (otherParticipant) {
      return `${otherParticipant.first_name} ${otherParticipant.last_name}`;
    }
    return 'Conversazione';
  };

  const getConversationSubtitle = (conversation: Conversation) => {
    if (conversation.space?.title) {
      return `Spazio: ${conversation.space.title}`;
    }
    if (conversation.booking?.booking_date) {
      return `Prenotazione del ${new Date(conversation.booking.booking_date).toLocaleDateString('it-IT')}`;
    }
    return '';
  };

  const formatMessageTime = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffHours < 168) { // 7 days
      return date.toLocaleDateString('it-IT', { 
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const isStitch = import.meta.env.VITE_UI_THEME === 'stitch';

  const messagesContent = (
    <div className="container max-w-4xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messaggi
          </CardTitle>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Caricamento conversazioni...</p>
          </div>
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessuna conversazione</h3>
            <p className="text-muted-foreground">
              Le tue conversazioni appariranno qui quando inizierai a chattare.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <Card 
              key={conversation.id}
              className="hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => navigate(`/messages/conversation/${conversation.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {getConversationTitle(conversation)}
                    </h3>
                    {getConversationSubtitle(conversation) && (
                      <p className="text-sm text-muted-foreground truncate">
                        {getConversationSubtitle(conversation)}
                      </p>
                    )}
                    {conversation.last_message && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conversation.last_message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground ml-4">
                    <Clock className="h-3 w-3" />
                    {formatMessageTime(conversation.last_message_at || conversation.updated_at)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return isStitch ? (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg)]" />}>
      <ThreadsLayoutStitch>
        {messagesContent}
      </ThreadsLayoutStitch>
    </Suspense>
  ) : (
    messagesContent
  );
};

export default Messages;
