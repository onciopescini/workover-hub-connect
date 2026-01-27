
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';
import { toast } from 'sonner';
import type { RealtimePayload } from '@/types/realtime';
import type { UserAchievementRow } from '@/types/supabase-joins';

export interface Achievement {
  id: string;
  achievement_id: string;
  title: string;
  description: string;
  category: string;
  progress: number | null;
  icon: string;
  unlocked_at: string;
}

export const useAchievements = (userId?: string) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const getRecordId = (record: unknown): string | null => {
    if (!record || typeof record !== 'object') return null;
    const idValue = (record as Record<string, unknown>)['id'];
    return typeof idValue === 'string' ? idValue : null;
  };

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    fetchAchievements();

    // Real-time subscription for achievement updates
    const channel = supabase
      .channel(`achievements-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const typedPayload = payload as unknown as RealtimePayload<UserAchievementRow>;
          sreLogger.debug('Achievement realtime event', { payload: typedPayload });
          
          if (typedPayload.eventType === 'INSERT') {
            if (typedPayload.new) {
              const newAchievement = typedPayload.new as Achievement;
              setAchievements(prev => [...prev, newAchievement]);
              toast.success(`🎉 Achievement unlocked: ${newAchievement.title}`);
            }
          } else if (typedPayload.eventType === 'UPDATE') {
            const newId = getRecordId(typedPayload.new);
            if (newId && typedPayload.new) {
              setAchievements(prev =>
                prev.map(a => a.id === newId ? typedPayload.new as Achievement : a)
              );
            }
          } else if (typedPayload.eventType === 'DELETE') {
            const oldId = getRecordId(typedPayload.old);
            if (oldId) {
              setAchievements(prev => prev.filter(a => a.id !== oldId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchAchievements = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })
        .overrideTypes<Achievement[]>();

      if (error) throw error;

      setAchievements(data || []);
    } catch (error) {
      sreLogger.error('Failed to fetch achievements', { userId }, error as Error);
      toast.error('Failed to load achievements');
    } finally {
      setIsLoading(false);
    }
  };

  const unlockAchievement = async (
    achievementId: string,
    title: string,
    description: string,
    category: 'connections' | 'engagement' | 'activity',
    icon: string,
    progress: number = 100
  ) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievementId,
          title,
          description,
          category,
          icon,
          progress
        });

      if (error) {
        // If duplicate, silently ignore
        if (error.code === '23505') {
          sreLogger.debug('Achievement already unlocked', { achievementId });
          return false;
        }
        throw error;
      }

      sreLogger.info('Achievement unlocked', { achievementId, title });
      return true;
    } catch (error) {
      sreLogger.error('Failed to unlock achievement', { achievementId }, error as Error);
      return false;
    }
  };

  return {
    achievements,
    isLoading,
    unlockAchievement,
    refetch: fetchAchievements
  };
};
