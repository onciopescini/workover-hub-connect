import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLogger } from '@/hooks/useLogger';
import { cleanSignIn, cleanSignInWithGoogle, aggressiveSignOut, cleanupAuthState } from '@/lib/auth-utils';
import { getAuthSyncChannel } from '@/utils/auth/multi-tab-sync';
import { containsSuspiciousContent } from '@/utils/security';
import { AUTH_ERRORS, mapSupabaseError } from '@/utils/auth/auth-errors';
import type { Profile, SignUpResult } from '@/types/auth';
import type { Session, User } from '@supabase/supabase-js';
import { sanitizeProfileUpdate } from '@/utils/profile/sanitizeProfileUpdate';
import { queryKeys } from '@/lib/react-query-config';

const PROFILE_POST_REFRESH_INVALIDATION_DELAY_MS = 100;

interface UseAuthMethodsProps {
  fetchProfile: (userId: string) => Promise<Profile | null>;
  updateAuthState: (session: Session | null, profile: Profile | null) => void;
  refreshProfile: () => Promise<void>;
  clearCache: () => void;
  invalidateProfile: (userId: string) => void;
  currentUser: User | null;
}

export const useAuthMethods = ({
  fetchProfile,
  updateAuthState,
  refreshProfile,
  clearCache,
  invalidateProfile,
  currentUser
}: UseAuthMethodsProps) => {
  const { error } = useLogger({ context: 'useAuthMethods' });
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const signIn = useCallback(async (email: string, password: string, redirectTo?: string): Promise<void> => {
    try {
      const data = await cleanSignIn(email, password);

      if (data.user) {
        const profile = await fetchProfile(data.user.id);
        updateAuthState(data.session, profile);
        toast.success('Accesso effettuato con successo!');
        
        if (redirectTo && redirectTo !== '/login') {
          navigate(redirectTo, { replace: true });
        }
      }
    } catch (signInError: unknown) {
      error('Sign in error', signInError as Error, {
        operation: 'sign_in',
        email: email,
        redirectTo: redirectTo
      });
      throw signInError;
    }
  }, [error, fetchProfile, navigate, updateAuthState]);

  const signUp = useCallback(async (email: string, password: string, emailRedirectTo?: string): Promise<SignUpResult> => {
    try {
      // Pulisci eventuale stato auth e prova sign out globale per evitare limbo
      try {
        cleanupAuthState();
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        // Ignora errori di cleanup
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: emailRedirectTo ?? `${window.location.origin}/auth/callback`
        }
      });

      if (signUpError) {
        throw new Error(mapSupabaseError(signUpError));
      }
      
      // Check if email confirmation is required (user exists but no session)
      const needsEmailConfirmation = !!data.user && !data.session;
      
      return { needsEmailConfirmation };
    } catch (signUpError: unknown) {
      error('Sign up error', signUpError as Error, {
        operation: 'sign_up',
        email: email,
        emailRedirectTo
      });
      throw signUpError;
    }
  }, [error]);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    try {
      const currentPath = `${location.pathname}${location.search}${location.hash}`;
      const safeReturnUrl = currentPath.startsWith('/') ? currentPath : '/';
      await cleanSignInWithGoogle(safeReturnUrl);
    } catch (googleError: unknown) {
      error('Google sign in error', googleError as Error, {
        operation: 'google_sign_in'
      });
      throw googleError;
    }
  }, [error, location.hash, location.pathname, location.search]);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      clearCache();
      await aggressiveSignOut();
      toast.success('Logout effettuato con successo');
    } catch (signOutError: unknown) {
      error('Sign out error', signOutError as Error, {
        operation: 'sign_out',
        userId: currentUser?.id
      });
      toast.success('Logout effettuato con successo');
      const errorMessage = signOutError instanceof Error ? signOutError.message : 'Errore durante il logout';
      throw new Error(errorMessage);
    }
  }, [clearCache, error, currentUser?.id]);

  const updateProfile = useCallback(async (updates: Partial<Profile>): Promise<void> => {
    if (!currentUser) throw new Error(AUTH_ERRORS.PERMISSION_DENIED);

    try {
      // Security validation before processing
      Object.entries(updates).forEach(([key, value]) => {
        if (typeof value === 'string' && containsSuspiciousContent(value)) {
          throw new Error(`Invalid content detected in field: ${key}`);
        }
      });

      const sanitized = sanitizeProfileUpdate(updates);

      if (Object.keys(sanitized).length === 0) {
        return;
      }

      console.log('Sanitized Payload:', sanitized);

      const { error } = await supabase
        .from('profiles')
        .update(sanitized)
        .eq('id', currentUser.id);

      if (error) {
        throw new Error(mapSupabaseError(error));
      }

      const profileQueryKey = queryKeys.profile.all;
      await queryClient.invalidateQueries({ queryKey: profileQueryKey });
      await queryClient.refetchQueries({ queryKey: profileQueryKey });
      await refreshProfile();
      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), PROFILE_POST_REFRESH_INVALIDATION_DELAY_MS);
      });
      await queryClient.invalidateQueries({ queryKey: profileQueryKey });
      invalidateProfile(currentUser.id);

      // Broadcast a tutte le altre tab
      const authSync = getAuthSyncChannel();
      authSync.broadcastProfileUpdate({ userId: currentUser.id });

      toast.success('Profilo aggiornato con successo');
    } catch (updateError: unknown) {
      error('Update profile error', updateError as Error, {
        operation: 'update_profile',
        userId: currentUser?.id,
        updates: Object.keys(updates)
      });
      throw updateError;
    }
  }, [currentUser, error, refreshProfile, invalidateProfile, queryClient]);

  return {
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile
  };
};
