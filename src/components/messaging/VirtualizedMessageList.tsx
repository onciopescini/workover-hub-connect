import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { EnhancedMessageBubble } from './EnhancedMessageBubble';
import { ConversationItem } from "@/types/messaging";

interface VirtualizedMessageListProps {
  messages: Array<Record<string, unknown>>;
  height: number;
  itemHeight?: number;
  selectedConversation: ConversationItem;
}

const MessageItem = React.memo(({ index, style, data }: any) => {
  const { messages, selectedConversation } = data;
  const message = messages[index];
  
  return (
    <div style={style}>
      <div className="px-4 py-2">
        <EnhancedMessageBubble
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
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export const VirtualizedMessageList = React.memo(({ 
  messages, 
  height, 
  itemHeight = 120,
  selectedConversation 
}: VirtualizedMessageListProps) => {
  const memoizedData = useMemo(() => ({ 
    messages, 
    selectedConversation 
  }), [messages, selectedConversation]);

  if (messages.length <= 50) {
    // For small lists, render normally without virtualization
    return (
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
    );
  }

  return (
    <List
      height={height}
      width="100%"
      itemCount={messages.length}
      itemSize={itemHeight}
      itemData={memoizedData}
      overscanCount={5}
    >
      {MessageItem}
    </List>
  );
});

VirtualizedMessageList.displayName = 'VirtualizedMessageList';