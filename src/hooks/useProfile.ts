
import { useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/OptimizedAuthContext';

export const useProfile = () => {
  const { authState, refreshProfile } = useAuth();
  const isRefreshingRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const lastRefreshTimeRef = useRef<number>(0);
  const hasLoggedSuccessRef = useRef(false);

  // Memoize profile data to prevent unnecessary re-renders
  const memoizedProfile = useMemo(() => authState.profile, [authState.profile?.id, authState.profile?.updated_at]);

  const debouncedRefreshProfile = useCallback(async () => {
    if (isRefreshingRef.current || !authState.user) return;
    
    // Add stronger debounce - don't refresh if last refresh was less than 10 seconds ago
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 10000) {
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
      
      // Only log success once per session to prevent spam
      if (!hasLoggedSuccessRef.current) {
        console.log('[useProfile] Profile refreshed successfully');
        hasLoggedSuccessRef.current = true;
      }
    } catch (error) {
      console.error('[useProfile] Error refreshing profile:', error);
    } finally {
      // Reset flag after longer delay to prevent rapid successive calls
      refreshTimeoutRef.current = setTimeout(() => {
        isRefreshingRef.current = false;
      }, 5000); // Increased debounce time to 5 seconds
    }
  }, [refreshProfile]); // Removed authState.user?.id dependency to prevent loops

  return {
    profile: memoizedProfile,
    isLoading: authState.isLoading,
    refreshProfile: debouncedRefreshProfile
  };
};
