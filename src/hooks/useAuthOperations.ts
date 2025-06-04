
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types/auth';
import type { User, Session } from '@supabase/supabase-js';
import { cleanupAuthState, cleanSignIn } from '@/lib/auth-utils';
import { createContextualLogger } from '@/lib/logger';
import { useAsyncState } from './useAsyncState';

// Create contextual logger for auth operations
const authLogger = createContextualLogger('AuthOperations');

export interface UseAuthOperationsOptions {
  // Success/Error callbacks that match existing AuthContext API
  onProfileSuccess?: (profile: Profile) => void;
  onProfileError?: (error: Error) => void;
  onAuthSuccess?: (data: { user: User; session: Session }) => void;
  onAuthError?: (error: Error) => void;
  
  // Behavior options
  enableRetry?: boolean;
  enableToasts?: boolean;
  debounceMs?: number;
}

export interface UseAuthOperationsReturn {
  // Profile operations
  fetchProfile: (userId: string) => Promise<Profile | null>;
  refreshProfile: (userId: string) => Promise<Profile | null>;
  updateProfile: (updates: Partial<Profile>, userId: string) => Promise<Profile>;
  
  // Authentication operations
  signIn: (email: string, password: string) => Promise<{ user: User; session: Session }>;
  signUp: (email: string, password: string) => Promise<{ user: User; session: Session | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  
  // State management
  profileState: {
    data: Profile | null;
    isLoading: boolean;
    error: Error | null;
    isError: boolean;
    isSuccess: boolean;
    retry: () => Promise<Profile | null>;
    reset: () => void;
  };
  
  authState: {
    isLoading: boolean;
    error: Error | null;
    isError: boolean;
    retry: () => Promise<any>;
    reset: () => void;
  };
}

export const useAuthOperations = (options: UseAuthOperationsOptions = {}): UseAuthOperationsReturn => {
  const {
    onProfileSuccess,
    onProfileError,
    onAuthSuccess,
    onAuthError,
    enableRetry = true,
    enableToasts = true,
    debounceMs = 1000
  } = options;

  // Profile operations async state
  const profileAsyncState = useAsyncState<Profile>({
    successMessage: 'Profilo caricato con successo',
    errorMessage: 'Errore nel caricamento del profilo',
    onSuccess: onProfileSuccess,
    onError: onProfileError,
    debounceMs,
    maxRetries: enableRetry ? 3 : 0,
    retryDelay: 1000,
    showToasts: enableToasts,
    resetOnExecute: false
  });

  // Authentication operations async state
  const authAsyncState = useAsyncState<{ user: User; session: Session }>({
    successMessage: 'Accesso effettuato con successo',
    errorMessage: 'Errore durante l\'autenticazione',
    onSuccess: onAuthSuccess,
    onError: onAuthError,
    maxRetries: enableRetry ? 2 : 0,
    retryDelay: 1500,
    showToasts: enableToasts,
    resetOnExecute: true
  });

  // Profile operations
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const operation = async () => {
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
        authLogger.error('Error fetching profile', {
          action: 'profile_fetch_error',
          userId,
          errorCode: error.code,
          errorMessage: error.message
        }, error);
        throw new Error(`Errore nel caricamento del profilo: ${error.message}`);
      }

      authLogger.info('Profile fetched successfully', {
        action: 'profile_fetch_success',
        userId,
        profileId: profile?.id,
        hasProfile: !!profile
      });

      return profile;
    };

    return await profileAsyncState.execute(operation);
  }, [profileAsyncState]);

  const refreshProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    authLogger.info('Starting profile refresh', {
      action: 'profile_refresh_start',
      userId
    });

    return await fetchProfile(userId);
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>, userId: string): Promise<Profile> => {
    const operation = async () => {
      authLogger.info('Starting profile update', {
        action: 'profile_update_start',
        userId,
        updateFields: Object.keys(updates)
      });

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        authLogger.error('Profile update failed', {
          action: 'profile_update_error',
          userId,
          updateFields: Object.keys(updates)
        }, error);
        throw new Error(`Errore nell'aggiornamento del profilo: ${error.message}`);
      }

      authLogger.info('Profile update successful', {
        action: 'profile_update_success',
        userId,
        updatedFields: Object.keys(updates)
      });

      return data;
    };

    return await profileAsyncState.execute(operation) as Profile;
  }, [profileAsyncState]);

  // Authentication operations
  const signIn = useCallback(async (email: string, password: string): Promise<{ user: User; session: Session }> => {
    const operation = async () => {
      authLogger.info('Starting sign in process', {
        action: 'sign_in_start',
        email,
        timestamp: Date.now()
      });

      const data = await cleanSignIn(email, password);
      
      if (!data.user || !data.session) {
        throw new Error('Credenziali non valide');
      }

      authLogger.info('Sign in successful', {
        action: 'sign_in_success',
        email: data.user.email,
        userId: data.user.id,
        hasSession: !!data.session
      });

      return { user: data.user, session: data.session };
    };

    return await authAsyncState.execute(operation) as { user: User; session: Session };
  }, [authAsyncState]);

  const signUp = useCallback(async (email: string, password: string): Promise<{ user: User; session: Session | null }> => {
    const operation = async () => {
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

      if (error) {
        throw new Error(`Errore durante la registrazione: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('Errore nella creazione dell\'account');
      }

      authLogger.info('Sign up successful', {
        action: 'sign_up_success',
        email: data.user.email,
        userId: data.user.id,
        needsConfirmation: !data.session
      });

      return { user: data.user, session: data.session };
    };

    return await authAsyncState.execute(operation) as { user: User; session: Session | null };
  }, [authAsyncState]);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    const operation = async () => {
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

      if (error) {
        throw new Error(`Errore durante l'accesso con Google: ${error.message}`);
      }

      authLogger.info('Google sign in initiated', {
        action: 'google_sign_in_initiated',
        hasUrl: !!data.url,
        provider: data.provider
      });

      return data;
    };

    await authAsyncState.execute(operation);
  }, [authAsyncState]);

  const signOut = useCallback(async (): Promise<void> => {
    const operation = async () => {
      authLogger.info('Starting sign out process', {
        action: 'sign_out_start',
        timestamp: Date.now()
      });

      cleanupAuthState();
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        authLogger.error('Supabase sign out error', {
          action: 'supabase_sign_out_error',
          errorCode: error.message
        }, error);
      }
      
      authLogger.info('Sign out completed', {
        action: 'sign_out_complete'
      });

      // Force reload to ensure clean state
      window.location.href = '/login';
    };

    await authAsyncState.execute(operation);
  }, [authAsyncState]);

  return {
    // Profile operations
    fetchProfile,
    refreshProfile,
    updateProfile,
    
    // Authentication operations
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    
    // State management
    profileState: {
      data: profileAsyncState.data,
      isLoading: profileAsyncState.isLoading,
      error: profileAsyncState.error,
      isError: profileAsyncState.isError,
      isSuccess: profileAsyncState.isSuccess,
      retry: profileAsyncState.retry,
      reset: profileAsyncState.reset
    },
    
    authState: {
      isLoading: authAsyncState.isLoading,
      error: authAsyncState.error,
      isError: authAsyncState.isError,
      retry: authAsyncState.retry,
      reset: authAsyncState.reset
    }
  };
};

// Convenience hooks for specific use cases
export const useProfileOperations = (userId?: string, options: UseAuthOperationsOptions = {}) => {
  const authOps = useAuthOperations(options);
  
  return {
    fetchProfile: userId ? () => authOps.fetchProfile(userId) : undefined,
    refreshProfile: userId ? () => authOps.refreshProfile(userId) : undefined,
    updateProfile: userId ? (updates: Partial<Profile>) => authOps.updateProfile(updates, userId) : undefined,
    profileState: authOps.profileState
  };
};

export const useAuthFlow = (options: UseAuthOperationsOptions = {}) => {
  const authOps = useAuthOperations(options);
  
  return {
    signIn: authOps.signIn,
    signUp: authOps.signUp,
    signInWithGoogle: authOps.signInWithGoogle,
    signOut: authOps.signOut,
    authState: authOps.authState
  };
};

export default useAuthOperations;
