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
  // Today checkins
  todayCheckins: {
    all: ['today-checkins'] as const,
    list: (userId?: string) => [...queryKeys.todayCheckins.all, userId] as const,
  },

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

  // Space location/access
  spaceLocation: {
    detail: (spaceId: string | undefined) => ['space-location', spaceId] as const,
  },
  spaceAccess: {
    confirmedBooking: (spaceId: string | undefined) => ['has-confirmed-booking', spaceId] as const,
  },

  // Space metrics/reviews
  spaceMetrics: {
    detail: (spaceId: string) => ['space-metrics', spaceId] as const,
  },
  spaceReviews: {
    list: (spaceId: string) => ['space-reviews', spaceId] as const,
    weightedRating: (spaceId: string) => ['space-weighted-rating', spaceId] as const,
  },
  
  // Bookings
  bookings: {
    all: ['bookings'] as const,
    lists: () => [...queryKeys.bookings.all, 'list'] as const,
    list: (filters: Record<string, any> | string) => [...queryKeys.bookings.lists(), filters] as const,
    details: () => [...queryKeys.bookings.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.bookings.details(), id] as const,
    userBookings: (userId: string) => [...queryKeys.bookings.all, 'user', userId] as const,
  },

  // Host/coworker booking lists
  hostBookings: {
    list: (userId?: string, roles?: string[] | null, filters?: Record<string, any>) =>
      ['host-bookings', userId, roles, filters] as const,
  },
  coworkerBookings: {
    list: (userId?: string, filters?: Record<string, any>) =>
      ['coworker-bookings', userId, filters] as const,
  },
  enhancedBookings: {
    all: ['enhanced-bookings'] as const,
    list: (userId?: string, roles?: string[] | null, filters?: Record<string, any>) =>
      [...queryKeys.enhancedBookings.all, userId, roles, filters] as const,
  },

  // Booking reviews
  bookingReviews: {
    received: (userId?: string) => ['booking-reviews-received', userId] as const,
    given: (userId?: string) => ['booking-reviews-given', userId] as const,
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

  // Host dashboard
  hostDashboard: {
    all: ['hostDashboard'] as const,
    stats: (hostId: string) => [...queryKeys.hostDashboard.all, 'stats', hostId] as const,
    bookings: (hostId: string) => [...queryKeys.hostDashboard.all, 'bookings', hostId] as const,
    messages: (hostId: string) => [...queryKeys.hostDashboard.all, 'messages', hostId] as const,
    reviews: (hostId: string) => [...queryKeys.hostDashboard.all, 'reviews', hostId] as const,
    spaces: (hostId: string) => [...queryKeys.hostDashboard.all, 'spaces', hostId] as const,
  },
  hostDashboardMetrics: {
    all: ['host-dashboard-metrics'] as const,
    detail: (hostId?: string) => [...queryKeys.hostDashboardMetrics.all, hostId] as const,
  },
  hostRecentActivity: {
    detail: (hostId?: string) => ['host-recent-activity', hostId] as const,
  },
  hostSpaceCount: {
    detail: (hostId?: string) => ['host-space-count', hostId] as const,
  },
  hostPayments: {
    list: (hostId?: string) => ['host-payments', hostId] as const,
  },
  hostPayoutEvents: {
    list: (hostId?: string) => ['host-payout-events', hostId] as const,
  },
  stripePayouts: {
    detail: (hostId?: string) => ['stripe-payouts', hostId] as const,
  },

  // Coworker documents
  coworkerDocuments: {
    receipts: (coworkerId: string, year?: number, isMockMode?: boolean) =>
      ['coworker-receipts', coworkerId, year, isMockMode] as const,
    invoices: (coworkerId: string, year?: number, isMockMode?: boolean) =>
      ['coworker-invoices', coworkerId, year, isMockMode] as const,
  },

  // Host invoices
  hostInvoices: {
    pending: (hostId: string, isMockMode?: boolean) =>
      ['host-pending-invoices', hostId, isMockMode] as const,
    creditNotes: (hostId: string, isMockMode?: boolean) =>
      ['host-pending-credit-notes', hostId, isMockMode] as const,
    history: (hostId: string, year?: number, isMockMode?: boolean) =>
      ['host-invoice-history', hostId, year, isMockMode] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.users.lists(), filters] as const,
    warnings: (userId: string) => [...queryKeys.users.all, 'warnings', userId] as const,
  },
  
  // Admin
  admin: {
    all: ['admin'] as const,
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
    users: (filters?: Record<string, any>) => [...queryKeys.admin.all, 'users', filters] as const,
    user: (userId: string) => [...queryKeys.admin.all, 'user', userId] as const,
    userInspector: (userId: string) => [...queryKeys.admin.all, 'user-inspector', userId] as const,
    userRoles: (userId: string) => [...queryKeys.admin.all, 'user-roles', userId] as const,
    reports: (filters?: Record<string, any>) => [...queryKeys.admin.all, 'reports', filters] as const,
    report: (reportId: string) => [...queryKeys.admin.all, 'report', reportId] as const,
    spaces: (filters?: Record<string, any>) => [...queryKeys.admin.all, 'spaces', filters] as const,
    space: (spaceId: string) => [...queryKeys.admin.all, 'space', spaceId] as const,
    pendingSpacesCount: () => [...queryKeys.admin.all, 'pending-spaces-count'] as const,
    latestSpaces: () => [...queryKeys.admin.all, 'latest-spaces'] as const,
    openReportsCount: () => [...queryKeys.admin.all, 'open-reports-count'] as const,
    activityLog: (limit?: number) => [...queryKeys.admin.all, 'activity-log', limit] as const,
    settings: (category?: string) => [...queryKeys.admin.all, 'settings', category] as const,
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
