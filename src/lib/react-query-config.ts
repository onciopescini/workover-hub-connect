import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { sreLogger } from '@/lib/sre-logger';
import { captureError } from '@/lib/sentry-config';
import { TIME_CONSTANTS, BUSINESS_RULES } from '@/constants';

/**
 * Configurazione avanzata React Query per performance ottimali
 */

// Query Cache con error handling
const queryCache = new QueryCache({
  onError: (error, query) => {
    sreLogger.error('Query failed', {
      action: 'query_error',
      queryKey: query.queryKey,
      error: (error as Error).message,
    });

    captureError(error as Error, {
      tags: {
        type: 'query_error',
        queryKey: JSON.stringify(query.queryKey),
      },
    });
  },
  onSuccess: (data, query) => {
    if (import.meta.env.MODE === 'development') {
      sreLogger.info('Query succeeded', {
        action: 'query_success',
        queryKey: query.queryKey,
      });
    }
  },
});

// Mutation Cache con error handling
const mutationCache = new MutationCache({
  onError: (error, variables, context, mutation) => {
    sreLogger.error('Mutation failed', {
      action: 'mutation_error',
      mutationKey: mutation.options.mutationKey,
      error: (error as Error).message,
    });

    captureError(error as Error, {
      tags: {
        type: 'mutation_error',
        mutationKey: JSON.stringify(mutation.options.mutationKey),
      },
    });
  },
  onSuccess: (data, variables, context, mutation) => {
    if (import.meta.env.MODE === 'development') {
      sreLogger.info('Mutation succeeded', {
        action: 'mutation_success',
        mutationKey: mutation.options.mutationKey,
      });
    }
  },
});

/**
 * QueryClient ottimizzato per produzione
 */
export const optimizedQueryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      // Cache configuration
      staleTime: TIME_CONSTANTS.STALE_TIME, // 5 minuti
      gcTime: TIME_CONSTANTS.CACHE_DURATION * 2, // 20 minuti
      
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Non ritentare per errori 4xx (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Max 2 retry per errori 5xx
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch configuration
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      refetchOnMount: true,
      
      // Performance
      networkMode: 'online',
      notifyOnChangeProps: 'all',
      
      // Structural sharing per performance
      structuralSharing: true,
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
      onError: (error) => {
        sreLogger.error('Mutation error', {
          action: 'mutation_error',
          error: (error as Error).message,
        });
      },
    },
  },
});

/**
 * Query keys factory per consistency
 */
export const queryKeys = {
  // Auth
  auth: {
    user: ['auth', 'user'] as const,
    session: ['auth', 'session'] as const,
  },
  
  // Spaces
  spaces: {
    all: ['spaces'] as const,
    lists: () => [...queryKeys.spaces.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.spaces.lists(), filters] as const,
    details: () => [...queryKeys.spaces.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.spaces.details(), id] as const,
    search: (query: string) => [...queryKeys.spaces.all, 'search', query] as const,
  },
  
  // Bookings
  bookings: {
    all: ['bookings'] as const,
    lists: () => [...queryKeys.bookings.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.bookings.lists(), filters] as const,
    details: () => [...queryKeys.bookings.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.bookings.details(), id] as const,
    userBookings: (userId: string) => [...queryKeys.bookings.all, 'user', userId] as const,
  },
  
  // Profile
  profile: {
    all: ['profile'] as const,
    detail: (userId: string) => [...queryKeys.profile.all, userId] as const,
    stats: (userId: string) => [...queryKeys.profile.all, 'stats', userId] as const,
  },
  
  // Messages
  messages: {
    all: ['messages'] as const,
    conversations: () => [...queryKeys.messages.all, 'conversations'] as const,
    conversation: (id: string) => [...queryKeys.messages.all, 'conversation', id] as const,
    unreadCount: () => [...queryKeys.messages.all, 'unread'] as const,
  },
  
  // Reviews
  reviews: {
    all: ['reviews'] as const,
    forSpace: (spaceId: string) => [...queryKeys.reviews.all, 'space', spaceId] as const,
    forUser: (userId: string) => [...queryKeys.reviews.all, 'user', userId] as const,
  },
  
  // Admin
  admin: {
    all: ['admin'] as const,
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
    reports: () => [...queryKeys.admin.all, 'reports'] as const,
  },
} as const;

/**
 * Prefetch utilities per ottimizzare la navigazione
 */
export const prefetchUtils = {
  /**
   * Prefetch space details quando si hovera su una card
   */
  async prefetchSpace(spaceId: string, fetcher: () => Promise<any>) {
    await optimizedQueryClient.prefetchQuery({
      queryKey: queryKeys.spaces.detail(spaceId),
      queryFn: fetcher,
      staleTime: TIME_CONSTANTS.STALE_TIME,
    });
  },

  /**
   * Prefetch user profile
   */
  async prefetchProfile(userId: string, fetcher: () => Promise<any>) {
    await optimizedQueryClient.prefetchQuery({
      queryKey: queryKeys.profile.detail(userId),
      queryFn: fetcher,
      staleTime: TIME_CONSTANTS.STALE_TIME,
    });
  },

  /**
   * Prefetch booking details
   */
  async prefetchBooking(bookingId: string, fetcher: () => Promise<any>) {
    await optimizedQueryClient.prefetchQuery({
      queryKey: queryKeys.bookings.detail(bookingId),
      queryFn: fetcher,
      staleTime: TIME_CONSTANTS.STALE_TIME,
    });
  },
};

/**
 * Cache invalidation utilities
 */
export const invalidateUtils = {
  /**
   * Invalida tutte le query degli spaces
   */
  async invalidateSpaces() {
    await optimizedQueryClient.invalidateQueries({
      queryKey: queryKeys.spaces.all,
    });
  },

  /**
   * Invalida un singolo space
   */
  async invalidateSpace(spaceId: string) {
    await optimizedQueryClient.invalidateQueries({
      queryKey: queryKeys.spaces.detail(spaceId),
    });
  },

  /**
   * Invalida tutti i bookings
   */
  async invalidateBookings() {
    await optimizedQueryClient.invalidateQueries({
      queryKey: queryKeys.bookings.all,
    });
  },

  /**
   * Invalida bookings di un utente
   */
  async invalidateUserBookings(userId: string) {
    await optimizedQueryClient.invalidateQueries({
      queryKey: queryKeys.bookings.userBookings(userId),
    });
  },

  /**
   * Invalida profile
   */
  async invalidateProfile(userId: string) {
    await optimizedQueryClient.invalidateQueries({
      queryKey: queryKeys.profile.detail(userId),
    });
  },

  /**
   * Invalida messages
   */
  async invalidateMessages() {
    await optimizedQueryClient.invalidateQueries({
      queryKey: queryKeys.messages.all,
    });
  },
};

/**
 * Optimistic update utilities
 */
export const optimisticUtils = {
  /**
   * Update ottimistico per i like/favorite
   */
  updateSpaceFavorite(spaceId: string, isFavorite: boolean) {
    optimizedQueryClient.setQueryData(
      queryKeys.spaces.detail(spaceId),
      (old: any) => {
        if (!old) return old;
        return { ...old, isFavorite };
      }
    );
  },

  /**
   * Update ottimistico per booking status
   */
  updateBookingStatus(bookingId: string, status: string) {
    optimizedQueryClient.setQueryData(
      queryKeys.bookings.detail(bookingId),
      (old: any) => {
        if (!old) return old;
        return { ...old, status };
      }
    );
  },
};
