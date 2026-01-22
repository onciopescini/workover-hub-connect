import React from 'react';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe }) => {
  return (
    <div className={cn("flex mb-4", isMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] px-4 py-2 rounded-2xl shadow-sm text-sm break-words",
          isMe
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-muted text-foreground rounded-bl-none"
        )}
      >
        <p>{message.content}</p>
        <div className={cn("text-[10px] mt-1 opacity-70", isMe ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {format(new Date(message.created_at), 'HH:mm')}
        </div>
      </div>
    </div>
  );
};
