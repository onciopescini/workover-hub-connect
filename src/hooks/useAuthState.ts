
import { useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { AuthState, Profile } from '@/types/auth';
import { useOptimizedProfile } from './useOptimizedProfile';

export const useAuthState = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const { fetchProfile, clearCache } = useOptimizedProfile();

  const updateAuthState = useCallback(async (user: User | null, session: Session | null) => {
    console.log('Updating auth state:', { user: !!user, session: !!session });
    
    if (user && session) {
      try {
        // Set authenticated state first with existing profile if available
        setAuthState(prev => ({
          user,
          session,
          profile: prev.profile, // Keep existing profile to avoid flicker
          isLoading: false,
          isAuthenticated: true,
        }));

        // Fetch profile only if we don't have one or if it's for a different user
        if (!authState.profile || authState.profile.id !== user.id) {
          const profile = await fetchProfile(user.id);
          setAuthState(prev => ({
            ...prev,
            profile
          }));
        }
      } catch (error) {
        console.error('Error in updateAuthState:', error);
        // Still set as authenticated even if profile fetch fails
        setAuthState({
          user,
          session,
          profile: null,
          isLoading: false,
          isAuthenticated: true,
        });
      }
    } else {
      console.log('Setting unauthenticated state');
      clearCache(); // Clear cache on logout
      setAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, [authState.profile, fetchProfile, clearCache]);

  const refreshProfile = useCallback(async () => {
    if (!authState.user) {
      console.log('No user to refresh profile for');
      return;
    }
    
    try {
      console.log('Refreshing profile for user:', authState.user.id);
      const profile = await fetchProfile(authState.user.id, true); // Force refresh
      setAuthState(prev => ({
        ...prev,
        profile
      }));
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  }, [authState.user, fetchProfile]);

  return {
    authState,
    setAuthState,
    updateAuthState,
    refreshProfile
  };
};
