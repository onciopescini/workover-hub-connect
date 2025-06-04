
import { useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useProfile = () => {
  const { authState, refreshProfile } = useAuth();
  const isRefreshingRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const lastRefreshTimeRef = useRef<number>(0);

  // Memoize profile data to prevent unnecessary re-renders
  const memoizedProfile = useMemo(() => authState.profile, [authState.profile?.id, authState.profile?.updated_at]);

  const debouncedRefreshProfile = useCallback(async () => {
    if (isRefreshingRef.current || !authState.user) return;
    
    // Add stronger debounce - don't refresh if last refresh was less than 5 seconds ago
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 5000) {
      console.log('[useProfile] Refresh debounced - too soon after last refresh');
      return;
    }
    
    isRefreshingRef.current = true;
    lastRefreshTimeRef.current = now;
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    try {
      await refreshProfile();
      console.log('[useProfile] Profile refreshed successfully');
    } catch (error) {
      console.error('[useProfile] Error refreshing profile:', error);
    } finally {
      // Reset flag after delay to prevent rapid successive calls
      refreshTimeoutRef.current = setTimeout(() => {
        isRefreshingRef.current = false;
      }, 3000); // Increased debounce time to 3 seconds
    }
  }, [refreshProfile, authState.user?.id]);

  return {
    profile: memoizedProfile,
    isLoading: authState.isLoading,
    refreshProfile: debouncedRefreshProfile
  };
};
