
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AuthState, AuthContextType, Profile } from '@/types/auth';
import type { User, Session } from '@supabase/supabase-js';
import { cleanupAuthState, cleanSignIn } from '@/lib/auth-utils';
import { createContextualLogger } from '@/lib/logger';

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

  // Anti-loop flags
  const isRefreshingRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchProfile = async (userId: string) => {
    const stopTimer = authLogger.startTimer('fetchProfile');
    
    try {
      authLogger.debug('Starting profile fetch', {
        action: 'profile_fetch_start',
        userId,
        timestamp: Date.now()
      });

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        authLogger.error('Error fetching profile', error, {
          action: 'profile_fetch_error',
          userId,
          errorCode: error.code,
          errorMessage: error.message
        });
        return null;
      }

      authLogger.info('Profile fetched successfully', {
        action: 'profile_fetch_success',
        userId,
        profileId: profile?.id,
        hasProfile: !!profile
      });

      return profile;
    } catch (error) {
      authLogger.error('Exception in fetchProfile', error instanceof Error ? error : new Error('Unknown error'), {
        action: 'profile_fetch_exception',
        userId
      });
      return null;
    } finally {
      stopTimer();
    }
  };

  // Debounced refresh profile to prevent infinite loops
  const refreshProfile = useCallback(async () => {
    if (!authState.user || isRefreshingRef.current) {
      authLogger.debug('Skipping profile refresh', {
        action: 'profile_refresh_skip',
        hasUser: !!authState.user,
        isRefreshing: isRefreshingRef.current
      });
      return;
    }
    
    isRefreshingRef.current = true;
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    const stopTimer = authLogger.startTimer('refreshProfile');
    
    try {
      authLogger.info('Starting profile refresh', {
        action: 'profile_refresh_start',
        userId: authState.user.id
      });

      const profile = await fetchProfile(authState.user.id);
      setAuthState(prev => ({
        ...prev,
        profile
      }));

      authLogger.info('Profile refresh completed', {
        action: 'profile_refresh_complete',
        userId: authState.user.id,
        profileUpdated: !!profile
      });
    } catch (error) {
      authLogger.error('Error refreshing profile', error instanceof Error ? error : new Error('Profile refresh failed'), {
        action: 'profile_refresh_error',
        userId: authState.user?.id
      });
    } finally {
      stopTimer();
      // Reset flag after a delay to prevent rapid successive calls
      refreshTimeoutRef.current = setTimeout(() => {
        isRefreshingRef.current = false;
        authLogger.debug('Profile refresh flag reset', {
          action: 'profile_refresh_flag_reset'
        });
      }, 1000);
    }
  }, [authState.user?.id]); // Only depend on user id, not entire authState

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!authState.user) {
      const error = new Error('User not authenticated');
      authLogger.error('Profile update attempted without authentication', error, {
        action: 'profile_update_unauthorized',
        updates: Object.keys(updates)
      });
      throw error;
    }

    const stopTimer = authLogger.startTimer('updateProfile');

    try {
      authLogger.info('Starting profile update', {
        action: 'profile_update_start',
        userId: authState.user.id,
        updateFields: Object.keys(updates)
      });

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authState.user.id)
        .select()
        .single();

      if (error) throw error;

      setAuthState(prev => ({
        ...prev,
        profile: data
      }));

      authLogger.info('Profile update successful', {
        action: 'profile_update_success',
        userId: authState.user.id,
        updatedFields: Object.keys(updates)
      });
    } catch (error) {
      authLogger.error('Profile update failed', error instanceof Error ? error : new Error('Profile update error'), {
        action: 'profile_update_error',
        userId: authState.user.id,
        updateFields: Object.keys(updates)
      });
      throw error;
    } finally {
      stopTimer();
    }
  };

  const signIn = async (email: string, password: string) => {
    const stopTimer = authLogger.startTimer('signIn');
    
    try {
      authLogger.info('Starting sign in process', {
        action: 'sign_in_start',
        email,
        timestamp: Date.now()
      });

      const data = await cleanSignIn(email, password);
      
      authLogger.info('Sign in successful', {
        action: 'sign_in_success',
        email: data.user?.email,
        userId: data.user?.id,
        hasSession: !!data.session
      });
    } catch (error) {
      authLogger.error('Sign in error', error instanceof Error ? error : new Error('Sign in failed'), {
        action: 'sign_in_error',
        email,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      stopTimer();
    }
  };

  const signUp = async (email: string, password: string) => {
    const stopTimer = authLogger.startTimer('signUp');
    
    try {
      authLogger.info('Starting sign up process', {
        action: 'sign_up_start',
        email,
        timestamp: Date.now()
      });

      // Clean up existing state first
      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      authLogger.info('Sign up successful', {
        action: 'sign_up_success',
        email: data.user?.email,
        userId: data.user?.id,
        needsConfirmation: !data.session
      });
    } catch (error) {
      authLogger.error('Sign up error', error instanceof Error ? error : new Error('Sign up failed'), {
        action: 'sign_up_error',
        email,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      stopTimer();
    }
  };

  const signInWithGoogle = async () => {
    const stopTimer = authLogger.startTimer('signInWithGoogle');
    
    try {
      authLogger.info('Starting Google sign in', {
        action: 'google_sign_in_start',
        redirectUrl: `${window.location.origin}/auth/callback`,
        timestamp: Date.now()
      });

      // Clean up existing state first
      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      authLogger.info('Google sign in initiated', {
        action: 'google_sign_in_initiated',
        hasUrl: !!data.url,
        provider: data.provider
      });
    } catch (error) {
      authLogger.error('Google sign in error', error instanceof Error ? error : new Error('Google sign in failed'), {
        action: 'google_sign_in_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      stopTimer();
    }
  };

  const updateAuthState = async (user: User | null, session: Session | null) => {
    const stopTimer = authLogger.startTimer('updateAuthState');
    
    authLogger.info('Updating auth state', {
      action: 'auth_state_update',
      user: user?.email,
      hasSession: !!session,
      userId: user?.id,
      sessionId: session?.access_token?.slice(-8) // Last 8 chars for identification
    });
    
    if (user && session) {
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
  };

  const signOut = async () => {
    const stopTimer = authLogger.startTimer('signOut');
    
    try {
      authLogger.info('Starting sign out process', {
        action: 'sign_out_start',
        userId: authState.user?.id,
        email: authState.user?.email
      });

      cleanupAuthState();
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        authLogger.error('Supabase sign out error', error, {
          action: 'supabase_sign_out_error',
          errorCode: error.message
        });
      }
      
      // Clear auth state immediately
      setAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      authLogger.info('Sign out completed, redirecting to login', {
        action: 'sign_out_complete',
        redirectUrl: '/login'
      });

      // Force reload to ensure clean state
      window.location.href = '/login';
    } catch (error) {
      authLogger.error('Error during sign out', error instanceof Error ? error : new Error('Sign out failed'), {
        action: 'sign_out_error',
        userId: authState.user?.id
      });
      throw error;
    } finally {
      stopTimer();
    }
  };

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
          authLogger.error('Error getting initial session', error, {
            action: 'initial_session_error',
            errorMessage: error.message
          });
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
        authLogger.error('Exception getting initial session', error instanceof Error ? error : new Error('Initial session exception'), {
          action: 'initial_session_exception'
        });
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
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      authLogger.info('AuthProvider cleanup completed', {
        action: 'auth_provider_cleanup'
      });
    };
  }, []);

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
