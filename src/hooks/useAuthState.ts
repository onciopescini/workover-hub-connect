
import { useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { AuthState, Profile } from '@/types/auth';
import { useProfile } from './useProfile';

export const useAuthState = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const { fetchProfile } = useProfile();

  const updateAuthState = useCallback(async (user: User | null, session: Session | null) => {
    console.log('Updating auth state:', { user: !!user, session: !!session });
    
    if (user && session) {
      try {
        // Set authenticated state first
        setAuthState({
          user,
          session,
          profile: null, // Will be set after profile fetch
          isLoading: false,
          isAuthenticated: true,
        });

        // Fetch profile separately with timeout
        const profilePromise = fetchProfile(user.id);
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 5000); // 5 second timeout
        });

        const profile = await Promise.race([profilePromise, timeoutPromise]);
        
        setAuthState(prev => ({
          ...prev,
          profile
        }));

        if (!profile) {
          console.warn('Profile fetch timed out or failed, but user is authenticated');
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
      setAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (!authState.user) return;
    
    try {
      const profile = await fetchProfile(authState.user.id);
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
