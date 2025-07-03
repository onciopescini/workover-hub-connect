import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProfileCacheManager } from '@/utils/auth/profile-cache';
import type { Profile } from '@/types/auth';

export const useProfileCache = () => {
  const cacheManager = ProfileCacheManager.getInstance();

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    // Check cache first if not expired
    if (!cacheManager.shouldFetch(userId) && cacheManager.has(userId)) {
      return cacheManager.get(userId);
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      // Update cache
      if (data) {
        cacheManager.set(userId, data);
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, [cacheManager]);

  const invalidateProfile = useCallback((userId: string) => {
    cacheManager.invalidate(userId);
  }, [cacheManager]);

  const clearCache = useCallback(() => {
    cacheManager.clear();
  }, [cacheManager]);

  const getCachedProfile = useCallback((userId: string): Profile | null => {
    return cacheManager.get(userId);
  }, [cacheManager]);

  return {
    fetchProfile,
    invalidateProfile,
    clearCache,
    getCachedProfile
  };
};