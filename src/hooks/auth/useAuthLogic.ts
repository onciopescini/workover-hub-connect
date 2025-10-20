import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfileCache } from './useProfileCache';
import { useAuthRedirects } from './useAuthRedirects';
import { useLogger } from '@/hooks/useLogger';
import type { AuthState, Profile, UserRole } from '@/types/auth';
import { createAuthState, shouldUpdateAuthState } from '@/utils/auth/auth-helpers';
import { getAuthSyncChannel, AUTH_SYNC_EVENTS } from '@/utils/auth/multi-tab-sync';
import type { Session } from '@supabase/supabase-js';

export const useAuthLogic = () => {
  const { error: logError, debug } = useLogger({ context: 'useAuthLogic' });
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    roles: [],
    isLoading: true,
    isAuthenticated: false,
  });

  const { fetchProfile, invalidateProfile, clearCache, getCachedProfile } = useProfileCache();
  const { handleRoleBasedRedirect } = useAuthRedirects();
  
  // Ref per evitare re-render eccessivi e race conditions
  const isInitialized = useRef(false);
  const currentUserId = useRef<string | null>(null);

  // Fetch user roles
  const fetchUserRoles = useCallback(async (userId: string): Promise<UserRole[]> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        debug('Error fetching user roles', { error });
        return [];
      }

      return data.map(r => r.role as UserRole);
    } catch (error) {
      logError('Error fetching user roles', {}, error as Error);
      return [];
    }
  }, [debug, logError]);

  // Funzione ottimizzata per aggiornare lo stato auth
  const updateAuthState = useCallback(async (session: Session | null, profile: Profile | null = null) => {
    const user = session?.user || null;
    const isAuthenticated = !!session;
    const roles = session?.user ? await fetchUserRoles(session.user.id) : [];
    
    // Aggiorna solo se necessario per evitare re-render
    setAuthState(prev => {
      const newState = {
        user,
        session,
        profile,
        roles,
        isLoading: false,
        isAuthenticated
      };
      
      if (!shouldUpdateAuthState(prev, user, isAuthenticated, profile)) {
        return prev;
      }

      return newState;
    });

    // Gestisci redirect solo se necessario
    if (session && profile) {
      setTimeout(() => handleRoleBasedRedirect(profile, session, roles), 0);
    }
  }, [handleRoleBasedRedirect, fetchUserRoles, debug, logError]);

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
              debug('create-profile error', { error: createErr });
              
              // Fallback: prova inserimento diretto se edge function fallisce
              try {
                const { data: insertedProfile, error: insertErr } = await supabase
                  .from('profiles')
                  .insert({
                    id: session.user.id,
                    first_name: firstName,
                    last_name: lastName,
                    role: 'coworker',
                    onboarding_completed: false,
                  })
                  .select()
                  .single();
                
                if (!insertErr && insertedProfile) {
                  profile = insertedProfile as Profile;
                  debug('Profile created via direct insert fallback');
                }
              } catch (fallbackErr) {
                debug('Direct profile insert fallback also failed', { error: fallbackErr });
              }
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
    const authSync = getAuthSyncChannel();
    
    // Listen for logout events from other tabs
    const unsubscribeLogout = authSync.on(AUTH_SYNC_EVENTS.LOGOUT, () => {
      if (mounted) {
        updateAuthState(null);
        clearCache();
        window.location.href = '/login';
      }
    });

    // Listen for profile updates from other tabs
    const unsubscribeProfileUpdate = authSync.on(AUTH_SYNC_EVENTS.PROFILE_UPDATE, () => {
      if (mounted && authState.user) {
        refreshProfile();
      }
    });
    
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
      (event, session) => {
        if (!mounted) return;

        debug('Auth state changed', {
          event,
          hasSession: !!session,
          operation: 'auth_state_change'
        });

        // CRITICAL: Evita refetch inutili su TOKEN_REFRESHED
        // Il token viene refreshato automaticamente ma il profilo non cambia
        if (event === 'TOKEN_REFRESHED') {
          debug('Token refreshed, skipping profile refetch');
          return;
        }

        // Defer async operations per evitare deadlock
        if (session?.user) {
          setTimeout(() => {
            if (mounted) {
              fetchUserProfile(session.user.id);
            }
          }, 0);
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
      unsubscribeLogout();
      unsubscribeProfileUpdate();
    };
  }, [updateAuthState, fetchProfile, fetchUserProfile, authState.user, clearCache, refreshProfile]);

  return {
    authState,
    updateAuthState,
    refreshProfile,
    clearCache,
    invalidateProfile
  };
};