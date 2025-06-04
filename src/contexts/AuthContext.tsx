
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AuthState, AuthContextType, Profile } from '@/types/auth';
import type { User, Session } from '@supabase/supabase-js';
import { cleanupAuthState } from '@/lib/auth-utils';
import { createContextualLogger } from '@/lib/logger';
import { useAuthOperations, UseAuthOperationsOptions } from '@/hooks/useAuthOperations';

const AuthContext = createContext<AuthContextType | null>(null);

// Create contextual logger for AuthContext
const authLogger = createContextualLogger('AuthContext');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Global stability flags
  const hasInitializedProfile = useRef(false);
  const isProfileLoaded = useRef(false);
  const hasShownProfileSuccessToast = useRef(false);
  const lastProfileFetchTime = useRef<number>(0);
  const profileFetchInProgress = useRef(false);

  // Stabilized memoized user ID to prevent unnecessary re-renders
  const currentUserId = useMemo(() => authState.user?.id, [authState.user?.id]);

  // Configure auth operations with enhanced stability options
  const authOperationsOptions: UseAuthOperationsOptions = useMemo(() => ({
    onProfileSuccess: (profile: Profile) => {
      authLogger.info('Profile loaded successfully via useAuthOperations', {
        action: 'profile_context_success',
        userId: currentUserId,
        profileId: profile?.id
      });
      
      // Only show toast once per session and after initial load
      if (!hasShownProfileSuccessToast.current && hasInitializedProfile.current) {
        hasShownProfileSuccessToast.current = true;
      }
      
      isProfileLoaded.current = true;
    },
    onProfileError: (error: Error) => {
      authLogger.error('Profile operation failed in context', {
        action: 'profile_context_error',
        userId: currentUserId
      }, error);
    },
    onAuthSuccess: (data) => {
      authLogger.info('Auth operation successful in context', {
        action: 'auth_context_success',
        userId: data.user?.id,
        hasSession: !!data.session
      });
    },
    onAuthError: (error: Error) => {
      authLogger.error('Auth operation failed in context', {
        action: 'auth_context_error'
      }, error);
    },
    enableRetry: true,
    enableToasts: true,
    debounceMs: 2000, // Increased from 1000ms
    suppressInitialProfileToast: true // Suppress to prevent spam
  }), [currentUserId]);

  // Initialize auth operations hook with stabilized options
  const {
    fetchProfile,
    refreshProfile: refreshProfileOp,
    updateProfile: updateProfileOp,
    signIn: signInOp,
    signUp: signUpOp,
    signInWithGoogle: signInWithGoogleOp,
    signOut: signOutOp,
    profileState
  } = useAuthOperations(authOperationsOptions);

  // Stabilized profile update effect with aggressive debouncing
  useEffect(() => {
    if (profileState.data && currentUserId && !profileFetchInProgress.current) {
      setAuthState(prev => ({
        ...prev,
        profile: profileState.data
      }));
    }
  }, [profileState.data, currentUserId]);

  // Enhanced wrapper functions with idempotency and stability
  const refreshProfile = useCallback(async () => {
    if (!currentUserId || profileFetchInProgress.current) {
      authLogger.debug('Skipping profile refresh - no user or fetch in progress', {
        action: 'profile_refresh_skip',
        hasUser: !!currentUserId,
        fetchInProgress: profileFetchInProgress.current
      });
      return;
    }

    // Aggressive debounce - don't refresh if last refresh was less than 2 seconds ago
    const now = Date.now();
    if (now - lastProfileFetchTime.current < 2000) {
      authLogger.debug('Profile refresh debounced', {
        action: 'profile_refresh_debounced',
        timeSinceLastFetch: now - lastProfileFetchTime.current
      });
      return;
    }

    const stopTimer = authLogger.startTimer('refreshProfile');
    profileFetchInProgress.current = true;
    lastProfileFetchTime.current = now;
    
    try {
      authLogger.info('Starting profile refresh via context', {
        action: 'profile_refresh_context_start',
        userId: currentUserId
      });

      await refreshProfileOp(currentUserId);

      authLogger.info('Profile refresh completed via context', {
        action: 'profile_refresh_context_complete',
        userId: currentUserId
      });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('Profile refresh failed');
      authLogger.error('Error in context profile refresh', {
        action: 'profile_refresh_context_error',
        userId: currentUserId
      }, normalizedError);
    } finally {
      // Reset flag after delay to prevent rapid successive calls
      setTimeout(() => {
        profileFetchInProgress.current = false;
      }, 1000);
      stopTimer();
    }
  }, [currentUserId, refreshProfileOp]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!currentUserId) {
      const error = new Error('User not authenticated');
      authLogger.error('Profile update attempted without authentication', {
        action: 'profile_update_unauthorized',
        updates: Object.keys(updates)
      }, error);
      throw error;
    }

    const stopTimer = authLogger.startTimer('updateProfile');

    try {
      authLogger.info('Starting profile update via context', {
        action: 'profile_update_context_start',
        userId: currentUserId,
        updateFields: Object.keys(updates)
      });

      const updatedProfile = await updateProfileOp(updates, currentUserId);

      // Update local state immediately
      setAuthState(prev => ({
        ...prev,
        profile: updatedProfile
      }));

      authLogger.info('Profile update successful via context', {
        action: 'profile_update_context_success',
        userId: currentUserId,
        updatedFields: Object.keys(updates)
      });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('Profile update error');
      authLogger.error('Profile update failed in context', {
        action: 'profile_update_context_error',
        userId: currentUserId,
        updateFields: Object.keys(updates)
      }, normalizedError);
      throw error;
    } finally {
      stopTimer();
    }
  }, [currentUserId, updateProfileOp]);

  // Enhanced auth operation wrappers with stability
  const signIn = useCallback(async (email: string, password: string) => {
    const stopTimer = authLogger.startTimer('signIn');
    
    try {
      authLogger.info('Starting sign in process via context', {
        action: 'sign_in_context_start',
        email,
        timestamp: Date.now()
      });

      await signInOp(email, password);
      
      authLogger.info('Sign in successful via context', {
        action: 'sign_in_context_success',
        email
      });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('Sign in failed');
      authLogger.error('Sign in error in context', {
        action: 'sign_in_context_error',
        email,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }, normalizedError);
      throw error;
    } finally {
      stopTimer();
    }
  }, [signInOp]);

  const signUp = useCallback(async (email: string, password: string) => {
    const stopTimer = authLogger.startTimer('signUp');
    
    try {
      authLogger.info('Starting sign up process via context', {
        action: 'sign_up_context_start',
        email,
        timestamp: Date.now()
      });

      await signUpOp(email, password);

      authLogger.info('Sign up successful via context', {
        action: 'sign_up_context_success',
        email
      });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('Sign up failed');
      authLogger.error('Sign up error in context', {
        action: 'sign_up_context_error',
        email,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }, normalizedError);
      throw error;
    } finally {
      stopTimer();
    }
  }, [signUpOp]);

  const signInWithGoogle = useCallback(async () => {
    const stopTimer = authLogger.startTimer('signInWithGoogle');
    
    try {
      authLogger.info('Starting Google sign in via context', {
        action: 'google_sign_in_context_start',
        redirectUrl: `${window.location.origin}/auth/callback`,
        timestamp: Date.now()
      });

      await signInWithGoogleOp();

      authLogger.info('Google sign in initiated via context', {
        action: 'google_sign_in_context_initiated'
      });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('Google sign in failed');
      authLogger.error('Google sign in error in context', {
        action: 'google_sign_in_context_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }, normalizedError);
      throw error;
    } finally {
      stopTimer();
    }
  }, [signInWithGoogleOp]);

  const signOut = useCallback(async () => {
    const stopTimer = authLogger.startTimer('signOut');
    
    try {
      authLogger.info('Starting sign out process via context', {
        action: 'sign_out_context_start',
        userId: currentUserId,
        email: authState.user?.email
      });

      // Reset global flags
      hasInitializedProfile.current = false;
      isProfileLoaded.current = false;
      hasShownProfileSuccessToast.current = false;
      lastProfileFetchTime.current = 0;
      profileFetchInProgress.current = false;

      await signOutOp();
      
      authLogger.info('Sign out completed via context', {
        action: 'sign_out_context_complete'
      });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('Sign out failed');
      authLogger.error('Error during sign out in context', {
        action: 'sign_out_context_error',
        userId: currentUserId
      }, normalizedError);
      throw error;
    } finally {
      stopTimer();
    }
  }, [currentUserId, signOutOp, authState.user?.email]);

  // Stabilized updateAuthState with singleton pattern and enhanced debouncing
  const updateAuthState = useCallback(async (user: User | null, session: Session | null) => {
    const stopTimer = authLogger.startTimer('updateAuthState');
    
    authLogger.info('Updating auth state', {
      action: 'auth_state_update',
      user: user?.email,
      hasSession: !!session,
      userId: user?.id,
      sessionId: session?.access_token?.slice(-8) // Last 8 chars for identification
    });
    
    if (user && session) {
      // Only fetch profile if not already loaded and not in progress
      let profile = null;
      if (!isProfileLoaded.current && !profileFetchInProgress.current) {
        profileFetchInProgress.current = true;
        try {
          profile = await fetchProfile(user.id);
          isProfileLoaded.current = true;
          hasInitializedProfile.current = true;
        } catch (error) {
          authLogger.error('Failed to fetch profile during auth state update', {
            action: 'auth_state_profile_fetch_error',
            userId: user.id
          }, error instanceof Error ? error : new Error('Profile fetch failed'));
        } finally {
          profileFetchInProgress.current = false;
        }
      } else {
        // Use existing profile if already loaded
        profile = authState.profile;
      }
      
      setAuthState({
        user,
        session,
        profile,
        isLoading: false,
        isAuthenticated: true,
      });

      authLogger.info('Auth state updated - authenticated', {
        action: 'auth_state_authenticated',
        userId: user.id,
        email: user.email,
        hasProfile: !!profile
      });
    } else {
      // Reset all flags on unauthenticated state
      hasInitializedProfile.current = false;
      isProfileLoaded.current = false;
      hasShownProfileSuccessToast.current = false;
      lastProfileFetchTime.current = 0;
      profileFetchInProgress.current = false;

      setAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
      });

      authLogger.info('Auth state updated - unauthenticated', {
        action: 'auth_state_unauthenticated'
      });
    }
    
    stopTimer();
  }, [fetchProfile, authState.profile]);

  // Enhanced initialization with better stability
  useEffect(() => {
    let mounted = true;
    
    authLogger.info('AuthProvider initialization started', {
      action: 'auth_provider_init',
      timestamp: Date.now()
    });
    
    // Get initial session with enhanced error handling
    const getInitialSession = async () => {
      const stopTimer = authLogger.startTimer('getInitialSession');
      
      try {
        authLogger.debug('Getting initial session', {
          action: 'initial_session_check'
        });

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          authLogger.error('Error getting initial session', {
            action: 'initial_session_error',
            errorMessage: error.message
          }, error);
          if (mounted) {
            setAuthState(prev => ({ ...prev, isLoading: false }));
          }
          return;
        }
        
        authLogger.info('Initial session check completed', {
          action: 'initial_session_complete',
          hasSession: !!session,
          userEmail: session?.user?.email || 'No session'
        });

        if (mounted) {
          await updateAuthState(session?.user || null, session);
        }
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error('Initial session exception');
        authLogger.error('Exception getting initial session', {
          action: 'initial_session_exception'
        }, normalizedError);
        if (mounted) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } finally {
        stopTimer();
      }
    };

    getInitialSession();

    // Enhanced auth state change listener with debouncing
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        authLogger.info('Auth state changed', {
          action: 'auth_state_change',
          event,
          userEmail: session?.user?.email,
          hasSession: !!session,
          userId: session?.user?.id
        });
        
        // Use setTimeout to defer the state update and prevent deadlocks
        setTimeout(async () => {
          if (mounted) {
            await updateAuthState(session?.user || null, session);
          }
        }, 0);
      }
    );

    // Cleanup function
    return () => {
      mounted = false;
      subscription.unsubscribe();
      
      authLogger.info('AuthProvider cleanup completed', {
        action: 'auth_provider_cleanup'
      });
    };
  }, []); // Empty dependency array - this should only run once

  // Memoized context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(() => ({
    authState,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
    updateProfile,
  }), [authState, signIn, signUp, signInWithGoogle, signOut, refreshProfile, updateProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
