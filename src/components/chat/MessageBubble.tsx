import React from 'react';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { AttachmentPreview } from './AttachmentPreview';
import type { LucideIcon } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onDelete?: (messageId: string) => void;
  deleteIcon?: LucideIcon;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe, onDelete, deleteIcon: DeleteIcon }) => {
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const isOnlyAttachment = hasAttachments && (!message.content || message.content === '📎 Allegato');

  return (
    <div className={cn("flex mb-4 group", isMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] px-4 py-2 rounded-2xl shadow-sm text-sm break-words relative",
          isMe
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-muted text-foreground rounded-bl-none"
        )}
      >
        {/* Text content (hide if only attachment placeholder) */}
        {!isOnlyAttachment && message.content && (
          <p>{message.content}</p>
        )}
        
        {/* Attachments */}
        {hasAttachments && (
          <AttachmentPreview 
            attachments={message.attachments!} 
            isMe={isMe} 
          />
        )}
        
        <div className={cn("text-[10px] mt-1 opacity-70", isMe ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {format(new Date(message.created_at), 'HH:mm')}
        </div>
        {isMe && onDelete && DeleteIcon && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDelete(message.id)}
            title="Elimina messaggio"
          >
            <DeleteIcon className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};
