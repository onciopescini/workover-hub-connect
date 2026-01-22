import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError, logInfo } from '@/lib/sre-logger';
import type { Database } from '@/integrations/supabase/types';

interface CacheOptions {
  ttlMinutes?: number;
  spaceId?: string;
}

export function useDistributedCache<T = unknown>() {
  const [loading, setLoading] = useState(false);

  const get = useCallback(async (key: string): Promise<T | null> => {
    try {
      const { data, error } = await supabase
        .from('availability_cache')
        .select('data, expires_at')
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      logInfo('cache_hit', { key, expires_at: data.expires_at });
      return data.data as T;
    } catch (error) {
      logError('Cache get failed', { context: 'cache_get', key }, error as Error);
      return null;
    }
  }, []);

  const set = useCallback(async (
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<boolean> => {
    const { ttlMinutes = 30, spaceId } = options;
    setLoading(true);

    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

      type CacheInsert = Database['public']['Tables']['availability_cache']['Insert'];
      const payload: CacheInsert = {
        cache_key: key,
        data: value as unknown,
        expires_at: expiresAt.toISOString(),
        space_id: spaceId ?? null
      };

      const { error } = await supabase
        .from('availability_cache')
        .upsert([payload], {
          onConflict: 'cache_key'
        });

      if (error) throw error;

      logInfo('cache_set', { key, ttl_minutes: ttlMinutes, expires_at: expiresAt });
      return true;
    } catch (error) {
      logError('Cache set failed', { context: 'cache_set', key }, error as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const invalidate = useCallback(async (pattern: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('availability_cache')
        .delete()
        .like('cache_key', `${pattern}%`);

      if (error) throw error;

      logInfo('cache_invalidate', { pattern });
    } catch (error) {
      logError('Cache invalidate failed', { context: 'cache_invalidate', pattern }, error as Error);
    }
  }, []);

  return {
    get,
    set,
    invalidate,
    loading
  };
}
