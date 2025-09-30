import { useDistributedCache } from '@/hooks/useDistributedCache';

export interface CachedAvailability {
  spaceId: string;
  dateFrom: string;
  dateTo: string;
  bookings: any[];
  cachedAt: string;
}

export function useAvailabilityCache() {
  const cache = useDistributedCache<CachedAvailability>();

  const getCacheKey = (spaceId: string, dateFrom: string, dateTo: string) => {
    return `availability:${spaceId}:${dateFrom}:${dateTo}`;
  };

  const getAvailability = async (
    spaceId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<CachedAvailability | null> => {
    const key = getCacheKey(spaceId, dateFrom, dateTo);
    return await cache.get(key);
  };

  const setAvailability = async (
    spaceId: string,
    dateFrom: string,
    dateTo: string,
    bookings: any[]
  ): Promise<boolean> => {
    const key = getCacheKey(spaceId, dateFrom, dateTo);
    const data: CachedAvailability = {
      spaceId,
      dateFrom,
      dateTo,
      bookings,
      cachedAt: new Date().toISOString()
    };
    
    return await cache.set(key, data, { ttlMinutes: 15, spaceId });
  };

  const invalidateSpace = async (spaceId: string): Promise<void> => {
    await cache.invalidate(`availability:${spaceId}:`);
  };

  return {
    getAvailability,
    setAvailability,
    invalidateSpace,
    loading: cache.loading
  };
}
