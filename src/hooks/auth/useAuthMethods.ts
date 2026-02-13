import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLogger } from '@/hooks/useLogger';
import { cleanSignIn, cleanSignInWithGoogle, aggressiveSignOut, cleanupAuthState } from '@/lib/auth-utils';
import { getAuthSyncChannel } from '@/utils/auth/multi-tab-sync';
import { containsSuspiciousContent } from '@/utils/security';
import { AUTH_ERRORS, mapSupabaseError } from '@/utils/auth/auth-errors';
import type { Profile, SignUpResult } from '@/types/auth';
import type { Session, User } from '@supabase/supabase-js';

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
  }, [fetchProfile, updateAuthState, navigate]);

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
      await cleanSignInWithGoogle();
    } catch (googleError: unknown) {
      error('Google sign in error', googleError as Error, {
        operation: 'google_sign_in'
      });
      throw googleError;
    }
  }, []);

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

  // Sanitize and normalize profile updates before sending to DB
  const sanitizeProfileUpdates = (raw: Partial<Profile>): Partial<Profile> => {
    const cleaned: Record<string, any> = {};

    const stringToNullKeys = new Set([
      'first_name','last_name','nickname','job_title','job_type','work_style','bio','location','skills','interests',
      'website','linkedin_url','twitter_url','instagram_url','facebook_url','youtube_url','github_url',
      'profile_photo_url','profession','city','phone','collaboration_description','tax_country','vat_number','tax_id',
      'admin_notes','suspension_reason','restriction_reason','return_url','stripe_account_id'
    ]);

    const allowedJobTypes = new Set(['full_time','part_time','freelance','contract','intern','unemployed','student']);
    const allowedWorkStyles = new Set(['remote','hybrid','office','nomad']);
    const allowedPreferredModes = new Set(['remoto','presenza','ibrido','flessibile', 'remote', 'hybrid', 'office']);

    for (const [key, value] of Object.entries(raw)) {
      if (value === undefined) continue; // don't touch undefined keys

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (stringToNullKeys.has(key) && trimmed === '') {
          cleaned[key] = null;
          continue;
        }

        if (key === 'job_type') {
          cleaned[key] = trimmed && allowedJobTypes.has(trimmed) ? trimmed : null;
          continue;
        }
        if (key === 'work_style') {
          cleaned[key] = trimmed && allowedWorkStyles.has(trimmed) ? trimmed : null;
          continue;
        }
        if (key === 'preferred_work_mode') {
          cleaned[key] = trimmed && allowedPreferredModes.has(trimmed) ? trimmed : 'flessibile';
          continue;
        }

        cleaned[key] = trimmed;
      } else if (Array.isArray(value)) {
        cleaned[key] = value; // trust arrays like collaboration_types
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned as Partial<Profile>;
  };

  const updateProfile = useCallback(async (updates: Partial<Profile>): Promise<void> => {
    if (!currentUser) throw new Error(AUTH_ERRORS.PERMISSION_DENIED);

    try {
      // Security validation before processing
      Object.entries(updates).forEach(([key, value]) => {
        if (typeof value === 'string' && containsSuspiciousContent(value)) {
          throw new Error(`Invalid content detected in field: ${key}`);
        }
      });

      const sanitized = sanitizeProfileUpdates(updates);
      const { error } = await supabase
        .from('profiles')
        .update(sanitized)
        .eq('id', currentUser.id);

      if (error) {
        throw new Error(mapSupabaseError(error));
      }

      // Invalida cache e ricarica nella tab corrente
      invalidateProfile(currentUser.id);
      await refreshProfile();
      
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
  }, [currentUser, refreshProfile, invalidateProfile]);

  return {
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile
  };
};
