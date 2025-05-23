
import React from "react";
import { UserNotification } from "@/types/notification";
import { NotificationIcon } from "./NotificationIcon";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { markNotificationAsRead } from "@/lib/notification-utils";

interface NotificationItemProps {
  notification: UserNotification;
  onMarkAsRead?: (id: string) => void;
  onClick?: (notification: UserNotification) => void;
}

export function NotificationItem({ notification, onMarkAsRead, onClick }: NotificationItemProps) {
  const handleClick = async () => {
    if (!notification.is_read && onMarkAsRead) {
      const success = await markNotificationAsRead(notification.id);
      if (success) {
        onMarkAsRead(notification.id);
      }
    }
    
    if (onClick) {
      onClick(notification);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'message': return 'Messaggio';
      case 'booking': return 'Prenotazione';
      case 'event': return 'Evento';
      case 'review': return 'Recensione';
      case 'ticket': return 'Supporto';
      case 'system': return 'Sistema';
      default: return 'Notifica';
    }
  };

  return (
    <div
      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
        !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          <NotificationIcon type={notification.type} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {getTypeLabel(notification.type)}
            </Badge>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(notification.created_at), { 
                addSuffix: true, 
                locale: it 
              })}
            </span>
          </div>
          
          <h4 className="text-sm font-medium text-gray-900 mt-1">
            {notification.title}
          </h4>
          
          {notification.content && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {notification.content}
            </p>
          )}
          
          {!notification.is_read && (
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
          )}
        </div>
      </div>
    </div>
  );
}
