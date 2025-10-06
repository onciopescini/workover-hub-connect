
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EnhancedMessageComposer } from "./EnhancedMessageComposer";
import { EnhancedMessageBubble } from "./EnhancedMessageBubble";
import { Search, MessageSquare, Users, ArrowLeft } from "lucide-react";
import { ConversationItem } from "@/types/messaging";

interface MessagesChatAreaProps {
  selectedConversation?: ConversationItem | undefined;
  messages: any[];
  onSendMessage: (content: string, attachments?: File[]) => Promise<void>;
}

export const MessagesChatArea = ({
  selectedConversation,
  messages,
  onSendMessage
}: MessagesChatAreaProps) => {
  if (!selectedConversation) {
    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardContent className="flex items-center justify-center h-full p-6">
          <div className="text-center text-muted-foreground max-w-md">
            <div className="mb-6 relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-primary/60" />
              </div>
              <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
              Benvenuto nella sezione Messaggi!
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Seleziona una conversazione dalla barra laterale per iniziare a chattare
            </p>
            <div className="flex items-center justify-center text-xs sm:text-sm text-muted-foreground bg-accent rounded-lg p-3">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span>Scegli una chat per vedere i tuoi messaggi</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full max-h-full flex flex-col overflow-hidden">
      {/* Chat Header - Fixed height */}
      <CardHeader className="border-b flex-shrink-0 py-3 bg-card">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              {selectedConversation.isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold truncate">
                {selectedConversation.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {selectedConversation.subtitle}
                {selectedConversation.isOnline && (
                  <span className="ml-2 text-green-600">• Online</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-xs">
              {selectedConversation.type}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {/* Messages - Flexible height with scrolling */}
      <CardContent className="flex-1 p-0 flex flex-col min-h-0 overflow-hidden max-h-[calc(100vh-280px)]">
        {/* Message Area - Scrollable */}
        <ScrollArea className="flex-1 min-h-0 h-full">
          {messages.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground p-4">
              <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-base sm:text-lg font-medium">Nessun messaggio</p>
              <p className="text-sm">Inizia la conversazione!</p>
            </div>
          ) : (
            <div className="p-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <EnhancedMessageBubble
                    key={(message['id'] as string) || `msg-${index}`}
                    id={(message['id'] as string) || `msg-${index}`}
                    content={message['content'] as string}
                    senderName={message['senderName'] as string}
                    senderAvatar={message['senderAvatar'] as string}
                    timestamp={message['created_at'] as string}
                    isCurrentUser={message['isCurrentUser'] as boolean}
                    isRead={message['is_read'] as boolean}
                    attachments={message['attachments'] as any[] || []}
                    businessContext={
                      selectedConversation.id.startsWith('booking-') ? {
                        type: 'booking' as const,
                        details: selectedConversation.subtitle
                      } : {
                        type: 'general' as const
                      }
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Message Composer - Fixed at bottom */}
        <div className="flex-shrink-0 border-t bg-background">
          <EnhancedMessageComposer
            onSend={onSendMessage}
            placeholder="Scrivi un messaggio..."
          />
        </div>
      </CardContent>
    </Card>
  );
};
