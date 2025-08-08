import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfileCache } from './useProfileCache';
import { useAuthRedirects } from './useAuthRedirects';
import { useLogger } from '@/hooks/useLogger';
import type { AuthState, Profile } from '@/types/auth';
import { createAuthState, shouldUpdateAuthState } from '@/utils/auth/auth-helpers';
import type { Session } from '@supabase/supabase-js';

export const useAuthLogic = () => {
  const { error: logError, debug } = useLogger({ context: 'useAuthLogic' });
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
        let profile = await fetchProfile(userId);
        const { data: { session } } = await supabase.auth.getSession();

        // Se il profilo non esiste, prova a crearlo tramite edge function e ricarica
        if (!profile && session?.user) {
          try {
            const firstName = (session.user.user_metadata?.['given_name']
              || session.user.user_metadata?.['first_name']
              || (session.user.user_metadata?.['full_name'] as string | undefined)?.split(' ')[0]
              || '');
            const lastName = (session.user.user_metadata?.['family_name']
              || session.user.user_metadata?.['last_name']
              || (session.user.user_metadata?.['full_name'] as string | undefined)?.split(' ').slice(1).join(' ')
              || '');

            const { data: created, error: createErr } = await supabase.functions.invoke('create-profile', {
              body: {
                user_id: session.user.id,
                email: session.user.email,
                first_name: firstName,
                last_name: lastName,
              }
            });

            if (createErr) {
              // Silenziosamente logga, ma non bloccare
              debug('create-profile error', { error: createErr });
            } else if (created?.profile) {
              profile = created.profile as Profile;
            }
          } catch (e) {
            debug('create-profile invocation failed', { error: e });
          }

          // In ogni caso prova a ricaricare dal DB
          if (!profile) {
            profile = await fetchProfile(userId);
          }
        }

        updateAuthState(session, profile);
      }, 0);
    } else {
      // Usa profilo cached se disponibile
      const cachedProfile = getCachedProfile(userId);
      const { data: { session } } = await supabase.auth.getSession();
      updateAuthState(session, cachedProfile);
    }
  }, [fetchProfile, getCachedProfile, updateAuthState, debug]);

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
          logError('Error getting session during auth initialization', error as Error, {
            operation: 'get_session'
          });
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
        logError('Auth initialization error', error as Error, {
          operation: 'auth_initialization'
        });
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

        debug('Auth state changed', {
          event,
          hasSession: !!session,
          operation: 'auth_state_change'
        });

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