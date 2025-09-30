import { useState, useCallback, useEffect } from 'react';
import { logError, logInfo } from '@/lib/sre-logger';

export interface PaginationConfig<T> {
  fetchFn: (cursor: string | null, limit: number) => Promise<{
    data: T[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
  pageSize?: number;
  onError?: (error: Error) => void;
}

export interface PaginationResult<T> {
  data: T[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  currentPage: number;
  totalLoaded: number;
}

export function usePagination<T>({
  fetchFn,
  pageSize = 20,
  onError
}: PaginationConfig<T>): PaginationResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = useCallback(async (isRefresh: boolean = false) => {
    if (loading || (!isRefresh && !hasMore)) return;

    setLoading(true);
    const startTime = performance.now();

    try {
      const result = await fetchFn(isRefresh ? null : cursor, pageSize);
      const loadTime = performance.now() - startTime;

      logInfo('pagination_load', {
        page: currentPage,
        items_loaded: result.data.length,
        has_more: result.hasMore,
        load_time_ms: Math.round(loadTime)
      });

      if (isRefresh) {
        setData(result.data);
        setCurrentPage(1);
      } else {
        setData(prev => [...prev, ...result.data]);
        setCurrentPage(prev => prev + 1);
      }

      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      logError('Pagination load failed', { 
        context: 'pagination_load',
        page: currentPage,
        is_refresh: isRefresh
      }, error as Error);
      
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading, currentPage, pageSize, fetchFn, onError]);

  const loadMore = useCallback(() => loadData(false), [loadData]);
  
  const refresh = useCallback(() => loadData(true), [loadData]);

  const reset = useCallback(() => {
    setData([]);
    setCursor(null);
    setHasMore(true);
    setCurrentPage(1);
    logInfo('pagination_reset', {});
  }, []);

  // Initial load
  useEffect(() => {
    loadData(true);
  }, []);

  return {
    data,
    loading,
    hasMore,
    loadMore,
    refresh,
    reset,
    currentPage,
    totalLoaded: data.length
  };
}
