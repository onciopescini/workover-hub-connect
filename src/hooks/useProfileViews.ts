
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

export const useProfileViews = (profileId?: string) => {
  const [viewCount, setViewCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setIsLoading(false);
      return;
    }

    fetchViewCount();

    // Real-time subscription for new views
    const channel = supabase
      .channel(`profile-views-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_views',
          filter: `profile_id=eq.${profileId}`
        },
        () => {
          // Increment local count
          setViewCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  const fetchViewCount = async () => {
    if (!profileId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_profile_view_count', {
        p_profile_id: profileId,
        p_days_back: 30
      });

      if (error) throw error;

      setViewCount(data || 0);
    } catch (error) {
      sreLogger.error('Failed to fetch profile view count', { profileId }, error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const trackView = async (source?: string) => {
    if (!profileId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Don't track self-views
      if (user?.id === profileId) return;

      const { error } = await supabase
        .from('profile_views')
        .insert([{
          profile_id: profileId,
          viewer_id: user?.id || null,
          source: source || null,
          metadata: {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent
          }
        }]);

      if (error) throw error;

      sreLogger.debug('Profile view tracked', { profileId, viewerId: user?.id, source });
    } catch (error) {
      sreLogger.error('Failed to track profile view', { profileId }, error as Error);
    }
  };

  return {
    viewCount,
    isLoading,
    trackView,
    refetch: fetchViewCount
  };
};
