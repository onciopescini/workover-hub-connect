
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

        // STABILIZATION: Only update state if the set content actually changed
        setOnlineUsers(prev => {
           if (prev.size === users.size) {
               let isSame = true;
               for (const userId of users) {
                   if (!prev.has(userId)) {
                       isSame = false;
                       break;
                   }
               }
               if (isSame) return prev; // Return same reference to skip render
           }
           return users;
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers(prev => {
          // Check if we actually have new users to add
          const usersToAdd = newPresences.filter((p: any) => p.user_id && !prev.has(p.user_id));
          if (usersToAdd.length === 0) return prev;

          const newSet = new Set(prev);
          usersToAdd.forEach((p: any) => newSet.add(p.user_id));
          return newSet;
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setOnlineUsers(prev => {
           // Check if we actually have users to remove
           const usersToRemove = leftPresences.filter((p: any) => p.user_id && prev.has(p.user_id));
           if (usersToRemove.length === 0) return prev;

           const newSet = new Set(prev);
           usersToRemove.forEach((p: any) => newSet.delete(p.user_id));
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
