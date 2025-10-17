import React, { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CriticalNotificationsBanner() {
  const { notifications, markAsRead } = useNotifications();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const navigate = useNavigate();

  const criticalNotifications = notifications.filter(
    n => (n as any).priority === 'critical' && !n.is_read && !dismissed.includes(n.id)
  );

  if (criticalNotifications.length === 0) return null;

  const handleDismiss = async (notificationId: string) => {
    setDismissed(prev => [...prev, notificationId]);
    await markAsRead(notificationId);
  };

  const handleClick = (notification: any) => {
    // Handle navigation based on notification type
    const typeRoutes: Record<string, string> = {
      booking: '/bookings',
      message: '/messages',
      event: '/events',
      review: '/reviews',
      system: '/notifications',
      ticket: '/support',
      connection: '/networking'
    };

    const route = typeRoutes[notification.type] || '/notifications';
    navigate(route);
    handleDismiss(notification.id);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top">
      <div className="bg-destructive text-destructive-foreground shadow-lg">
        <div className="container mx-auto px-4 py-3">
          {criticalNotifications.map((notification) => (
            <Alert
              key={notification.id}
              variant="destructive"
              className="mb-2 last:mb-0 border-0 bg-transparent"
            >
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="text-white font-semibold">
                {notification.title}
              </AlertTitle>
              <AlertDescription className="text-white/90 flex items-center justify-between">
                <span>{notification.content}</span>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleClick(notification)}
                  >
                    Visualizza
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(notification.id)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </div>
    </div>
  );
}
