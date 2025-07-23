
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
          <div className="text-center text-gray-500 max-w-md">
            <div className="mb-6 relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-indigo-400" />
              </div>
              <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
              Benvenuto nella sezione Messaggi!
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Seleziona una conversazione dalla barra laterale per iniziare a chattare
            </p>
            <div className="flex items-center justify-center text-xs sm:text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span>Scegli una chat per vedere i tuoi messaggi</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {/* Chat Header - Fixed height */}
      <CardHeader className="border-b flex-shrink-0 py-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold truncate">
                {selectedConversation.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {selectedConversation.subtitle}
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
      <CardContent className="flex-1 p-0 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-gray-500">
                  <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-base sm:text-lg font-medium">Nessun messaggio</p>
                  <p className="text-sm">Inizia la conversazione!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <EnhancedMessageBubble
                      key={message.id}
                      id={message.id}
                      content={message.content}
                      attachments={message.attachments?.map((url: string) => ({
                        url,
                        type: url.includes('.jpg') || url.includes('.png') ? 'image' as const : 'file' as const,
                        name: url.split('/').pop() || 'file'
                      }))}
                      senderName={message.senderName}
                      senderAvatar={message.senderAvatar}
                      timestamp={message.created_at}
                      isCurrentUser={message.isCurrentUser}
                      isRead={message.is_read}
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
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Message Composer - Fixed at bottom */}
        <div className="flex-shrink-0 border-t">
          <EnhancedMessageComposer
            onSend={onSendMessage}
            placeholder="Scrivi un messaggio..."
          />
        </div>
      </CardContent>
    </Card>
  );
};
