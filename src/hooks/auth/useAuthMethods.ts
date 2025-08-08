import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLogger } from '@/hooks/useLogger';
import { cleanSignIn, cleanSignInWithGoogle, aggressiveSignOut, cleanupAuthState } from '@/lib/auth-utils';
import type { Profile } from '@/types/auth';
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
      const errorMessage = signInError instanceof Error ? signInError.message : 'Errore durante l\'accesso';
      throw new Error(errorMessage);
    }
  }, [fetchProfile, updateAuthState, navigate]);

  const signUp = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      // Pulisci eventuale stato auth e prova sign out globale per evitare limbo
      try {
        cleanupAuthState();
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        // Ignora errori di cleanup
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      toast.success('Registrazione completata! Controlla la tua email per confermare l\'account.');
    } catch (signUpError: unknown) {
      error('Sign up error', signUpError as Error, {
        operation: 'sign_up',
        email: email
      });
      const errorMessage = signUpError instanceof Error ? signUpError.message : 'Errore durante la registrazione';
      throw new Error(errorMessage);
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    try {
      await cleanSignInWithGoogle();
    } catch (googleError: unknown) {
      error('Google sign in error', googleError as Error, {
        operation: 'google_sign_in'
      });
      const errorMessage = googleError instanceof Error ? googleError.message : 'Errore durante l\'accesso con Google';
      throw new Error(errorMessage);
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

  const updateProfile = useCallback(async (updates: Partial<Profile>): Promise<void> => {
    if (!currentUser) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser.id);

      if (error) throw error;

      // Invalida cache e ricarica
      invalidateProfile(currentUser.id);
      await refreshProfile();
      toast.success('Profilo aggiornato con successo');
    } catch (updateError: unknown) {
      error('Update profile error', updateError as Error, {
        operation: 'update_profile',
        userId: currentUser?.id,
        updates: Object.keys(updates)
      });
      const errorMessage = updateError instanceof Error ? updateError.message : 'Errore durante l\'aggiornamento del profilo';
      throw new Error(errorMessage);
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