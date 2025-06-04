
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

  // Configure auth operations with context-specific callbacks
  const authOperationsOptions: UseAuthOperationsOptions = {
    onProfileSuccess: (profile: Profile) => {
      authLogger.info('Profile loaded successfully via useAuthOperations', {
        action: 'profile_context_success',
        userId: authState.user?.id,
        profileId: profile?.id
      });
    },
    onProfileError: (error: Error) => {
      authLogger.error('Profile operation failed in context', {
        action: 'profile_context_error',
        userId: authState.user?.id
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
    debounceMs: 1000
  };

  // Initialize auth operations hook
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

  // Update auth state when profile state changes
  useEffect(() => {
    if (profileState.data && authState.user) {
      setAuthState(prev => ({
        ...prev,
        profile: profileState.data
      }));
    }
  }, [profileState.data, authState.user?.id]);

  // Wrapper functions to maintain existing API
  const refreshProfile = useCallback(async () => {
    if (!authState.user) {
      authLogger.debug('Skipping profile refresh - no user', {
        action: 'profile_refresh_skip'
      });
      return;
    }

    const stopTimer = authLogger.startTimer('refreshProfile');
    
    try {
      authLogger.info('Starting profile refresh via context', {
        action: 'profile_refresh_context_start',
        userId: authState.user.id
      });

      await refreshProfileOp(authState.user.id);

      authLogger.info('Profile refresh completed via context', {
        action: 'profile_refresh_context_complete',
        userId: authState.user.id
      });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('Profile refresh failed');
      authLogger.error('Error in context profile refresh', {
        action: 'profile_refresh_context_error',
        userId: authState.user?.id
      }, normalizedError);
    } finally {
      stopTimer();
    }
  }, [authState.user?.id, refreshProfileOp]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!authState.user) {
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
        userId: authState.user.id,
        updateFields: Object.keys(updates)
      });

      const updatedProfile = await updateProfileOp(updates, authState.user.id);

      // Update local state immediately
      setAuthState(prev => ({
        ...prev,
        profile: updatedProfile
      }));

      authLogger.info('Profile update successful via context', {
        action: 'profile_update_context_success',
        userId: authState.user.id,
        updatedFields: Object.keys(updates)
      });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('Profile update error');
      authLogger.error('Profile update failed in context', {
        action: 'profile_update_context_error',
        userId: authState.user.id,
        updateFields: Object.keys(updates)
      }, normalizedError);
      throw error;
    } finally {
      stopTimer();
    }
  }, [authState.user?.id, updateProfileOp]);

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
        userId: authState.user?.id,
        email: authState.user?.email
      });

      await signOutOp();
      
      authLogger.info('Sign out completed via context', {
        action: 'sign_out_context_complete'
      });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error('Sign out failed');
      authLogger.error('Error during sign out in context', {
        action: 'sign_out_context_error',
        userId: authState.user?.id
      }, normalizedError);
      throw error;
    } finally {
      stopTimer();
    }
  }, [authState.user?.id, signOutOp]);

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
      // Fetch profile using the new hook
      const profile = await fetchProfile(user.id);
      
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
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;
    
    authLogger.info('AuthProvider initialization started', {
      action: 'auth_provider_init',
      timestamp: Date.now()
    });
    
    // Get initial session
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

    // Listen for auth changes
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
  }, [updateAuthState]);

  const value: AuthContextType = {
    authState,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
    updateProfile,
  };

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
