
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/hooks/auth/useAuth';

export const useUserPresence = () => {
  const { authState } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authState.user?.id) return;

    const channel = supabase.channel('online-users');

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users = new Set<string>();

        for (const key in newState) {
           const presenceList = newState[key];
           presenceList.forEach((presence: any) => {
             if (presence.user_id) {
               users.add(presence.user_id);
             }
           });
        }
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newPresences.forEach((p: any) => {
            if (p.user_id) newSet.add(p.user_id);
          });
          return newSet;
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setOnlineUsers(prev => {
           const newSet = new Set(prev);
           leftPresences.forEach((p: any) => {
             if (p.user_id) newSet.delete(p.user_id);
           });
           return newSet;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: authState.user!.id,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.user?.id]);

  const isUserOnline = (userId: string) => {
    return onlineUsers.has(userId);
  };

  return { onlineUsers, isUserOnline };
};
