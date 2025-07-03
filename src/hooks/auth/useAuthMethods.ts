import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cleanSignIn, cleanSignInWithGoogle, aggressiveSignOut } from '@/lib/auth-utils';
import type { Profile } from '@/types/auth';

interface UseAuthMethodsProps {
  fetchProfile: (userId: string) => Promise<Profile | null>;
  updateAuthState: (session: any, profile: any) => void;
  refreshProfile: () => Promise<void>;
  clearCache: () => void;
  invalidateProfile: (userId: string) => void;
  currentUser: any;
}

export const useAuthMethods = ({
  fetchProfile,
  updateAuthState,
  refreshProfile,
  clearCache,
  invalidateProfile,
  currentUser
}: UseAuthMethodsProps) => {
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
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Errore durante l\'accesso');
    }
  }, [fetchProfile, updateAuthState, navigate]);

  const signUp = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      toast.success('Registrazione completata! Controlla la tua email per confermare l\'account.');
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Errore durante la registrazione');
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    try {
      await cleanSignInWithGoogle();
    } catch (error: any) {
      console.error('Google sign in error:', error);
      throw new Error(error.message || 'Errore durante l\'accesso con Google');
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      clearCache();
      await aggressiveSignOut();
      toast.success('Logout effettuato con successo');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.success('Logout effettuato con successo');
      throw new Error(error.message || 'Errore durante il logout');
    }
  }, [clearCache]);

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
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw new Error(error.message || 'Errore durante l\'aggiornamento del profilo');
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