
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image as ImageIcon, CheckCheck, Check, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface MessageAttachment {
  url: string;
  type: 'image' | 'file';
  name: string;
  size?: number;
}

interface EnhancedMessageBubbleProps {
  id: string;
  content?: string;
  attachments?: MessageAttachment[];
  senderName: string;
  senderAvatar?: string;
  timestamp: string;
  isCurrentUser: boolean;
  isRead?: boolean;
  isDelivered?: boolean;
  isPending?: boolean;
  priority?: 'urgent' | 'high' | 'normal';
  businessContext?: {
    type: 'booking' | 'payment' | 'general';
    details?: string;
  };
}

export const EnhancedMessageBubble = ({
  content,
  attachments = [],
  senderName,
  senderAvatar,
  timestamp,
  isCurrentUser,
  isRead = false,
  isDelivered = false,
  isPending = false,
  priority = 'normal',
  businessContext
}: EnhancedMessageBubbleProps) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  const getStatusIcon = () => {
    if (isPending) return <Clock className="w-3 h-3 text-gray-400" />;
    if (isRead) return <CheckCheck className="w-3 h-3 text-blue-500" />;
    if (isDelivered) return <Check className="w-3 h-3 text-gray-500" />;
    return null;
  };

  const getPriorityBorder = () => {
    switch (priority) {
      case 'urgent': return 'border-l-4 border-l-red-500';
      case 'high': return 'border-l-4 border-l-yellow-500';
      default: return '';
    }
  };

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} max-w-[80%] gap-2`}>
        {!isCurrentUser && (
          <Avatar className="h-8 w-8 mt-1">
            <AvatarImage src={senderAvatar} />
            <AvatarFallback className="text-xs">
              {getInitials(senderName)}
            </AvatarFallback>
          </Avatar>
        )}

        <div className={`space-y-1 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
          {/* Business Context Banner */}
          {businessContext && (
            <div className="text-xs text-gray-500 mb-1">
              <Badge variant="outline" className="text-xs">
                {businessContext.type === 'booking' ? '📅 Prenotazione' :
                 businessContext.type === 'payment' ? '💳 Pagamento' : '💬 Generale'}
                {businessContext.details && `: ${businessContext.details}`}
              </Badge>
            </div>
          )}

          <Card className={`${
            isCurrentUser ? 'bg-blue-500 text-white' : 'bg-gray-100'
          } ${getPriorityBorder()} shadow-sm`}>
            <CardContent className="p-3">
              {/* Message Content */}
              {content && (
                <p className={`text-sm ${isCurrentUser ? 'text-white' : 'text-gray-900'}`}>
                  {content}
                </p>
              )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {attachments.map((attachment, index) => (
                    <div key={index}>
                      {attachment.type === 'image' ? (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="max-w-full max-h-48 rounded-md object-cover"
                          />
                        </a>
                      ) : (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 p-2 rounded-md ${
                            isCurrentUser 
                              ? 'bg-blue-600 hover:bg-blue-700' 
                              : 'bg-gray-200 hover:bg-gray-300'
                          } transition-colors`}
                        >
                          <FileText className="h-4 w-4" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{attachment.name}</p>
                            {attachment.size && (
                              <p className="text-xs opacity-75">
                                {(attachment.size / 1024 / 1024).toFixed(1)} MB
                              </p>
                            )}
                          </div>
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Info */}
          <div className={`flex items-center gap-1 text-xs text-gray-500 ${
            isCurrentUser ? 'flex-row-reverse' : 'flex-row'
          }`}>
            {!isCurrentUser && <span>{senderName} •</span>}
            <span>{formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: it })}</span>
            {isCurrentUser && getStatusIcon()}
          </div>
        </div>
      </div>
    </div>
  );
};
