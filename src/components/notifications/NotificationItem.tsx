
import { UserNotification } from "@/types/notification";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Calendar, Users, Ticket, Heart, Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface NotificationItemProps {
  notification: UserNotification;
  onMarkAsRead: (id: string) => void;
  onClick: (notification: UserNotification) => void;
}

export function NotificationItem({ notification, onMarkAsRead, onClick }: NotificationItemProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'booking':
        return <Calendar className="w-4 h-4 text-green-500" />;
      case 'connection':
        return <Users className="w-4 h-4 text-purple-500" />;
      case 'review':
        return <Heart className="w-4 h-4 text-pink-500" />;
      case 'ticket':
        return <Ticket className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'bg-blue-100 text-blue-800';
      case 'booking':
        return 'bg-green-100 text-green-800';
      case 'connection':
        return 'bg-purple-100 text-purple-800';
      case 'review':
        return 'bg-pink-100 text-pink-800';
      case 'ticket':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      className={`p-4 border-l-4 cursor-pointer transition-all hover:bg-gray-50 ${
        !notification.is_read 
          ? 'border-l-indigo-500 bg-indigo-50' 
          : 'border-l-transparent'
      }`}
      onClick={() => onClick(notification)}
    >
      <div className="flex items-start space-x-3">
        {/* Icona della notifica */}
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Contenuto della notifica */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={`text-sm font-medium ${
                  !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  {notification.title}
                </h4>
                
                <Badge 
                  variant="secondary" 
                  className={`text-xs px-2 py-0.5 ${getNotificationBadgeColor(notification.type)}`}
                >
                  {notification.type}
                </Badge>
              </div>

              {notification.content && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {notification.content}
                </p>
              )}

              {/* Metadati */}
              {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                <div className="text-xs text-gray-500 space-y-1">
                  {notification.metadata["sender_name"] && (
                    <div>Da: {notification.metadata["sender_name"]}</div>
                  )}
                  {notification.metadata["space_title"] && (
                    <div>Spazio: {notification.metadata["space_title"]}</div>
                  )}
                </div>
              )}
            </div>

            {/* Azioni */}
            <div className="flex flex-col items-end space-y-2 ml-4">
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {formatDistanceToNow(new Date(notification.created_at), { 
                  addSuffix: true, 
                  locale: it 
                })}
              </span>

              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
