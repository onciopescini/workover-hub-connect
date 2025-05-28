
import { useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useProfile = () => {
  const { authState, refreshProfile } = useAuth();
  const isRefreshingRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  const debouncedRefreshProfile = useCallback(async () => {
    if (isRefreshingRef.current || !authState.user) return;
    
    isRefreshingRef.current = true;
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    try {
      await refreshProfile();
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      // Reset flag after delay to prevent rapid successive calls
      refreshTimeoutRef.current = setTimeout(() => {
        isRefreshingRef.current = false;
      }, 1000);
    }
  }, [refreshProfile, authState.user?.id]);

  return {
    profile: authState.profile,
    isLoading: authState.isLoading,
    refreshProfile: debouncedRefreshProfile
  };
};
