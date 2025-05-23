
import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, MarkAsRead } from "lucide-react";
import { NotificationItem } from "./NotificationItem";
import { UserNotification, NotificationCounts } from "@/types/notification";
import { getUserNotifications, getNotificationCounts, markAllNotificationsAsRead } from "@/lib/notification-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationCenter() {
  const { authState } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({ total: 0, unread: 0, byType: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!authState.user) return;
    
    setIsLoading(true);
    const [notificationsData, countsData] = await Promise.all([
      getUserNotifications(50),
      getNotificationCounts()
    ]);
    
    setNotifications(notificationsData);
    setCounts(countsData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [authState.user]);

  // Real-time subscription
  useEffect(() => {
    if (!authState.user) return;

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${authState.user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.user]);

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setCounts(prev => ({ 
      ...prev, 
      unread: Math.max(0, prev.unread - 1) 
    }));
  };

  const handleMarkAllAsRead = async () => {
    const success = await markAllNotificationsAsRead();
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setCounts(prev => ({ ...prev, unread: 0 }));
    }
  };

  const filterNotifications = (type?: string) => {
    if (!type || type === 'all') return notifications;
    return notifications.filter(n => n.type === type);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {counts.unread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {counts.unread > 99 ? '99+' : counts.unread}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Notifiche</SheetTitle>
            {counts.unread > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                <MarkAsRead className="w-3 h-3 mr-1" />
                Segna tutte
              </Button>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="all" className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              Tutte
              {counts.total > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {counts.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="message" className="text-xs">
              Messaggi
              {counts.byType.message && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {counts.byType.message}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="booking" className="text-xs">
              Prenotazioni
              {counts.byType.booking && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {counts.byType.booking}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ticket" className="text-xs">
              Supporto
              {counts.byType.ticket && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {counts.byType.ticket}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 h-full">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-500">Caricamento...</div>
                </div>
              ) : filterNotifications('all').length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <div className="text-sm text-gray-500">Nessuna notifica</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  {filterNotifications('all').map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="message" className="mt-4 h-full">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-0">
                {filterNotifications('message').map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="booking" className="mt-4 h-full">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-0">
                {filterNotifications('booking').map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ticket" className="mt-4 h-full">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-0">
                {filterNotifications('ticket').map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
