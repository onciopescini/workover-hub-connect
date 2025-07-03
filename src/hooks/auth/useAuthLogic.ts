import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfileCache } from './useProfileCache';
import { useAuthRedirects } from './useAuthRedirects';
import type { AuthState, Profile } from '@/types/auth';
import { createAuthState, shouldUpdateAuthState } from '@/utils/auth/auth-helpers';
import type { Session } from '@supabase/supabase-js';

export const useAuthLogic = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const { fetchProfile, invalidateProfile, clearCache, getCachedProfile } = useProfileCache();
  const { handleRoleBasedRedirect } = useAuthRedirects();
  
  // Ref per evitare re-render eccessivi e race conditions
  const isInitialized = useRef(false);
  const currentUserId = useRef<string | null>(null);

  // Funzione ottimizzata per aggiornare lo stato auth
  const updateAuthState = useCallback((session: Session | null, profile: Profile | null = null) => {
    const user = session?.user || null;
    const isAuthenticated = !!session;
    
    // Aggiorna solo se necessario per evitare re-render
    setAuthState(prev => {
      if (!shouldUpdateAuthState(prev, user, isAuthenticated, profile)) {
        return prev;
      }

      return createAuthState(session, profile);
    });

    // Gestisci redirect solo se necessario
    if (session && profile) {
      setTimeout(() => handleRoleBasedRedirect(profile, session), 0);
    }
  }, [handleRoleBasedRedirect]);

  // Profile fetching con gestione cache
  const fetchUserProfile = useCallback(async (userId: string) => {
    // Evita fetch profilo duplicati
    if (currentUserId.current !== userId) {
      currentUserId.current = userId;
      
      // Defer profile fetch per evitare deadlock
      setTimeout(async () => {
        const profile = await fetchProfile(userId);
        const { data: { session } } = await supabase.auth.getSession();
        updateAuthState(session, profile);
      }, 0);
    } else {
      // Usa profilo cached se disponibile
      const cachedProfile = getCachedProfile(userId);
      const { data: { session } } = await supabase.auth.getSession();
      updateAuthState(session, cachedProfile);
    }
  }, [fetchProfile, getCachedProfile, updateAuthState]);

  // Refresh profile forzato
  const refreshProfile = useCallback(async (): Promise<void> => {
    if (authState.user) {
      invalidateProfile(authState.user.id);
      const profile = await fetchProfile(authState.user.id);
      setAuthState(prev => ({ ...prev, profile }));
    }
  }, [authState.user, fetchProfile, invalidateProfile]);

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        // Check sessione esistente
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            updateAuthState(null);
          }
          return;
        }

        if (session?.user && mounted) {
          currentUserId.current = session.user.id;
          const profile = await fetchProfile(session.user.id);
          if (mounted) {
            updateAuthState(session, profile);
          }
        } else if (mounted) {
          updateAuthState(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          updateAuthState(null);
        }
      } finally {
        if (mounted) {
          isInitialized.current = true;
        }
      }
    };

    // Setup auth state listener con logica ottimizzata
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, !!session);

        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          currentUserId.current = null;
          if (mounted) {
            updateAuthState(null);
          }
        }
      }
    );

    // Inizializza solo se non già fatto
    if (!isInitialized.current) {
      initializeAuth();
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [updateAuthState, fetchProfile, fetchUserProfile]);

  return {
    authState,
    updateAuthState,
    refreshProfile,
    clearCache,
    invalidateProfile
  };
};