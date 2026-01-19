import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { OnlineStatusIndicator } from "./OnlineStatusIndicator";
import { ConversationItem } from "@/types/messaging";
import { Calendar, Users, MessageSquare, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface ModernConversationItemProps {
  conversation: ConversationItem;
  isSelected: boolean;
  onClick: () => void;
}

export const ModernConversationItem = ({
  conversation,
  isSelected,
  onClick
}: ModernConversationItemProps) => {
  const getInitials = (title: string) => {
    return title
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: it 
      });
    } catch {
      return '';
    }
  };

  const getTypeIcon = () => {
    switch (conversation.type) {
      case 'booking':
        return <Calendar className="h-3 w-3" />;
      case 'group':
        return <Users className="h-3 w-3" />;
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  const getStatusColor = () => {
    switch (conversation.status) {
      case 'confirmed':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200",
        "hover:bg-accent/50 border",
        isSelected 
          ? "bg-accent border-primary shadow-sm" 
          : "bg-card border-transparent hover:border-border"
      )}
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={conversation.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {getInitials(conversation.title)}
          </AvatarFallback>
        </Avatar>
        {conversation.is_online && (
          <OnlineStatusIndicator 
            isOnline={true} 
            size="md"
            className="absolute bottom-0 right-0"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={cn(
            "font-semibold text-sm truncate",
            conversation.unread_count ? "text-foreground" : "text-foreground/90"
          )}>
            {conversation.title}
          </h3>
          {conversation.last_message_at && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
              <Clock className="h-3 w-3" />
              {formatTime(conversation.last_message_at)}
            </span>
          )}
        </div>

        {conversation.subtitle && (
          <p className="text-xs text-muted-foreground mb-1 truncate">
            {conversation.subtitle}
          </p>
        )}

        {conversation.last_message && (
          <p className={cn(
            "text-sm truncate mb-2",
            conversation.unread_count
              ? "text-foreground font-medium" 
              : "text-muted-foreground"
          )}>
            {conversation.last_message}
          </p>
        )}

        {/* Badges and indicators */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            {getTypeIcon()}
            {conversation.type}
          </Badge>
          
          {conversation.status && (
            <Badge 
              variant="outline" 
              className={cn("text-xs", getStatusColor())}
            >
              {conversation.status}
            </Badge>
          )}

          {conversation.priority === 'urgent' && (
            <Badge variant="destructive" className="text-xs">
              Urgente
            </Badge>
          )}

          {conversation.unread_count && conversation.unread_count > 0 && (
            <Badge className="bg-primary text-primary-foreground text-xs">
              {conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
