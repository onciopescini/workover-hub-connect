import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/auth/useAuth';
import { toast } from 'sonner';
import { NOTIFICATIONS_TABLE } from '@/constants/notifications';

type NotificationRecord = Database['public']['Tables']['notifications']['Row'];

const MAX_NOTIFICATIONS = 30;

export function NotificationCenter() {
  const { authState } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.read_at === null).length,
    [notifications],
  );

  const fetchNotifications = useCallback(async () => {
    if (!authState.user) {
      setNotifications([]);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .select('id, user_id, type, title, message, metadata, read_at, created_at')
      .eq('user_id', authState.user.id)
      .order('created_at', { ascending: false })
      .limit(MAX_NOTIFICATIONS);

    if (error) {
      toast.error('Impossibile caricare le notifiche');
      setIsLoading(false);
      return;
    }

    setNotifications(data ?? []);
    setIsLoading(false);
  }, [authState.user]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!authState.user) {
      return;
    }

    const channel = supabase
      .channel(`notifications-${authState.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: NOTIFICATIONS_TABLE,
          filter: `user_id=eq.${authState.user.id}`,
        },
        () => {
          void fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authState.user, fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!authState.user || unreadCount === 0) {
      return;
    }

    const { error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', authState.user.id)
      .is('read_at', null);

    if (error) {
      toast.error('Errore durante l’aggiornamento delle notifiche');
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read_at: notification.read_at ?? new Date().toISOString(),
      })),
    );

    toast.success('Notifiche segnate come lette');
  }, [authState.user, unreadCount]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label="Apri centro notifiche">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" side="bottom" sideOffset={8} className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold">Notifiche</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="h-8 px-2 text-xs"
          >
            <CheckCheck className="mr-1 h-4 w-4" />
            Segna come lette
          </Button>
        </div>

        <Separator />

        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">Caricamento notifiche...</div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">Nessuna notifica disponibile.</div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 ${notification.read_at === null ? 'bg-muted/40' : 'bg-background'}`}
                >
                  <p className="text-sm font-medium leading-5">{notification.title ?? 'Nuova notifica'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message ?? 'Nessun messaggio disponibile.'}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {notification.created_at
                      ? format(new Date(notification.created_at), 'dd MMM yyyy, HH:mm', { locale: it })
                      : 'Data non disponibile'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
