
import { useState } from 'react';
import { Bell, Check, X, MessageSquare, Calendar, Users, Ticket, Heart, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/notification-utils';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { UserNotification } from '@/types/notification';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { NotificationPreferencesDialog } from './NotificationPreferencesDialog';

export function NotificationCenter() {
  const { notifications, counts, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const navigate = useNavigate();

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

  const handleMarkAsRead = async (notificationId: string) => {
    const success = await markNotificationAsRead(notificationId);
    if (success) {
      markAsRead(notificationId);
    }
  };

  const handleMarkAllAsRead = async () => {
    const success = await markAllNotificationsAsRead();
    if (success) {
      markAllAsRead();
    }
  };

  const filteredNotifications = notifications.filter(notification => 
    selectedType === 'all' || notification.type === selectedType
  );

  const getActionUrl = (notification: UserNotification) => {
    const metadata = notification.metadata;
    
    switch (notification.type) {
      case 'message':
        return metadata["booking_id"] ? `/messages?conversation=booking-${metadata["booking_id"]}` : '/messages';
      case 'booking':
        return metadata["booking_id"] ? `/bookings?booking_id=${metadata["booking_id"]}` : '/bookings';
      case 'event':
        return metadata["event_id"] ? `/events?event_id=${metadata["event_id"]}` : '/events';
      case 'review':
        return metadata["space_id"] ? `/host/reviews?space_id=${metadata["space_id"]}` : '/host/reviews';
      case 'connection':
        return metadata["connection_id"] ? `/networking?connection_id=${metadata["connection_id"]}` : '/networking';
      case 'ticket':
        return metadata["ticket_id"] ? `/support?ticket_id=${metadata["ticket_id"]}` : '/support';
      default:
        return '/notifications';
    }
  };

  const handleNotificationClick = (notification: UserNotification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    
    const url = getActionUrl(notification);
    navigate(url); // Use React Router navigation instead of window.location
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifiche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifiche
            {counts.unread > 0 && (
              <Badge variant="destructive" className="ml-2">
                {counts.unread}
              </Badge>
            )}
          </CardTitle>
          
          {counts.unread > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleMarkAllAsRead}
            >
              <Check className="w-4 h-4 mr-1" />
              Segna tutto
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreferencesOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Filtri per tipo */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant={selectedType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('all')}
          >
            Tutte ({counts.total})
          </Button>
          {Object.entries(counts.byType).map(([type, count]) => (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(type)}
              className="flex items-center gap-1"
            >
              {getNotificationIcon(type)}
              {count}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nessuna notifica
              </h3>
              <p className="text-gray-600">
                {selectedType === 'all' 
                  ? 'Non hai notifiche al momento' 
                  : `Nessuna notifica di tipo ${selectedType}`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <div 
                    className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h4>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
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
                                  handleMarkAsRead(notification.id);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {notification.content && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.content}
                          </p>
                        )}
                        
                        {/* Metadati aggiuntivi */}
                        {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            {notification.metadata["sender_name"] != null && (
                              <span>Da: {String(notification.metadata["sender_name"] as string)}</span>
                            )}
                            {notification.metadata["space_title"] != null && (
                              <span>Spazio: {String(notification.metadata["space_title"] as string)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {index < filteredNotifications.length - 1 && (
                    <Separator className="mx-4" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <NotificationPreferencesDialog 
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    </Card>
  );
}
