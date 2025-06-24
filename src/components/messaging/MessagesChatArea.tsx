
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EnhancedMessageComposer } from "./EnhancedMessageComposer";
import { EnhancedMessageBubble } from "./EnhancedMessageBubble";
import { Search, MessageSquare } from "lucide-react";

interface ConversationItem {
  id: string;
  type: 'booking' | 'private' | 'group';
  title: string;
  subtitle: string;
  avatar?: string;
  status?: 'confirmed' | 'pending' | 'active';
}

interface MessagesChatAreaProps {
  selectedConversation?: ConversationItem;
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
      <Card className="h-full flex flex-col">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Seleziona una conversazione</p>
            <p>Scegli una chat per iniziare a comunicare</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Chat Header */}
      <CardHeader className="border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold">
                {selectedConversation.title}
              </h3>
              <p className="text-sm text-gray-600">
                {selectedConversation.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {selectedConversation.type}
            </Badge>
            <Button variant="ghost" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-96 p-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nessun messaggio</p>
              <p>Inizia la conversazione!</p>
            </div>
          ) : (
            <div>
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
                      type: 'booking',
                      details: selectedConversation.subtitle
                    } : undefined
                  }
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Message Composer */}
        <EnhancedMessageComposer
          onSend={onSendMessage}
          placeholder="Scrivi un messaggio..."
        />
      </CardContent>
    </Card>
  );
};
