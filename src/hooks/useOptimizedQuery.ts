import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { queryKeys, invalidateUtils, optimisticUtils } from '@/lib/react-query-config';
import { sreLogger } from '@/lib/sre-logger';

/**
 * Hook ottimizzato per query con logging e error handling automatico
 */
export function useOptimizedQuery<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError> & {
    logKey?: string;
  }
) {
  const query = useQuery<TData, TError>(options);

  // Log performance in development
  if (import.meta.env.MODE === 'development' && options.logKey) {
    if (query.isFetched && query.dataUpdatedAt > 0) {
      sreLogger.info('Query completed', {
        action: 'query_complete',
        queryKey: options.logKey,
      });
    }
  }

  return query;
}

/**
 * Hook ottimizzato per mutations con invalidation automatica
 */
export function useOptimizedMutation<TData = unknown, TError = Error, TVariables = void>(
  options: UseMutationOptions<TData, TError, TVariables> & {
    invalidateKeys?: string[][];
    optimisticUpdate?: (variables: TVariables) => void;
    logKey?: string;
  }
) {
  const { invalidateKeys, optimisticUpdate, logKey, ...mutationOptions } = options;

  const mutation = useMutation<TData, TError, TVariables>({
    ...mutationOptions,
    onMutate: async (variables) => {
      // Optimistic update
      if (optimisticUpdate) {
        optimisticUpdate(variables);
      }

      // Call original onMutate
      return mutationOptions.onMutate?.(variables);
    },
    onSuccess: async (data, variables, context) => {
      // Invalidate specified queries
      if (invalidateKeys) {
        for (const keyArray of invalidateKeys) {
          const keyString = keyArray.join('_');
          const invalidateFn = (invalidateUtils as any)[keyString];
          if (typeof invalidateFn === 'function') {
            await invalidateFn();
          }
        }
      }

      // Log success
      if (logKey) {
        sreLogger.info('Mutation succeeded', {
          action: 'mutation_success',
          mutationKey: logKey,
        });
      }

      // Call original onSuccess
      return mutationOptions.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Log error
      if (logKey) {
        sreLogger.error('Mutation failed', {
          action: 'mutation_error',
          mutationKey: logKey,
          error: (error as Error).message,
        });
      }

      // Call original onError
      return mutationOptions.onError?.(error, variables, context);
    },
  });

  return mutation;
}

/**
 * Hook per parallel queries ottimizzate
 */
export function useParallelQueries<T extends Record<string, UseQueryOptions>>(
  queries: T
): {
  [K in keyof T]: ReturnType<typeof useQuery>;
} {
  const results = Object.entries(queries).reduce((acc, [key, queryOptions]) => {
    acc[key] = useQuery(queryOptions as UseQueryOptions);
    return acc;
  }, {} as any);

  return results;
}

/**
 * Hook per dependent queries (sequenziali)
 */
export function useDependentQuery<TData1, TData2>(
  firstQuery: UseQueryOptions<TData1>,
  secondQuery: (data: TData1) => UseQueryOptions<TData2>
) {
  const first = useQuery(firstQuery);
  
  const second = useQuery({
    ...secondQuery(first.data as TData1),
    enabled: first.isSuccess && !!first.data,
  });

  return {
    first,
    second,
    isLoading: first.isLoading || (first.isSuccess && second.isLoading),
    isError: first.isError || second.isError,
    error: first.error || second.error,
  };
}

/**
 * Hook per paginated queries
 */
export function usePaginatedQuery<TData>(
  queryKey: any[],
  fetcher: (page: number) => Promise<TData>,
  options?: Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'>
) {
  const [page, setPage] = React.useState(1);

  const query = useQuery<TData>({
    queryKey: [...queryKey, page],
    queryFn: () => fetcher(page),
    ...options,
  });

  const nextPage = () => setPage((p) => p + 1);
  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const goToPage = (p: number) => setPage(Math.max(1, p));

  return {
    ...query,
    page,
    nextPage,
    prevPage,
    goToPage,
  };
}

/**
 * Hook per infinite queries semplificate
 */
export function useInfiniteQuerySimplified<TData>(
  queryKey: any[],
  fetcher: (pageParam: number) => Promise<{ data: TData[]; nextPage?: number }>,
  options?: any
) {
  const { useInfiniteQuery } = require('@tanstack/react-query');
  
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) => fetcher(pageParam as number),
    getNextPageParam: (lastPage: { data: TData[]; nextPage?: number }) => lastPage.nextPage,
    initialPageParam: 1,
    ...options,
  });
}

// Re-export React for the hooks
import React from 'react';
