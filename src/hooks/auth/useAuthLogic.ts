import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfileCache } from './useProfileCache';
import { useAuthRedirects } from './useAuthRedirects';
import { useLogger } from '@/hooks/useLogger';
import type { AuthState, Profile, UserRole } from '@/types/auth';
import { shouldUpdateAuthState } from '@/utils/auth/auth-helpers';
import { getAuthSyncChannel, AUTH_SYNC_EVENTS } from '@/utils/auth/multi-tab-sync';
import type { RealtimePostgresChangesPayload, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type StripeOnboardingStatus = ProfileRow['stripe_onboarding_status'];

const isStripeOnboardingStatus = (status: unknown): status is StripeOnboardingStatus => {
  return status === 'none' || status === 'pending' || status === 'completed' || status === 'restricted' || status === null;
};

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
    } catch (err) {
      debug('Error fetching user roles', { error: err });
      return [];
    }
  }, [debug, logError]);

  // Funzione ottimizzata per aggiornare lo stato auth
  const updateAuthState = useCallback(async (session: Session | null, profile: Profile | null = null, signal?: AbortSignal) => {
    if (signal?.aborted) return;

    const user = session?.user || null;
    const isAuthenticated = !!session;
    const roles = session?.user ? await fetchUserRoles(session.user.id) : [];
    
    if (signal?.aborted) return;

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
      // Direct call instead of setTimeout
      handleRoleBasedRedirect(profile, session, roles);
    }
  }, [handleRoleBasedRedirect, fetchUserRoles, debug, logError]);

  // Profile fetching con gestione cache
  const fetchUserProfile = useCallback(async (userId: string, signal?: AbortSignal) => {
    // Evita fetch profilo duplicati
    if (currentUserId.current !== userId) {
      currentUserId.current = userId;
      
      // Direct async operations logic without setTimeout
      try {
        if (signal?.aborted) return;
        let profile = await fetchProfile(userId);
        if (signal?.aborted) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (signal?.aborted) return;

        // Se il profilo non esiste, prova a crearlo tramite edge function e ricarica
        if (!profile && session?.user) {
          // Verify roles first - prevent premature profile creation for users without role
          const roles = await fetchUserRoles(session.user.id);

          if (roles.length === 0) {
            debug('User has no roles, skipping profile creation to allow onboarding redirect');
            if (!signal?.aborted) {
              // DIRECT STATE UPDATE: Force isLoading to false immediately
              // This prevents the infinite spinner by bypassing any async overhead in updateAuthState
              setAuthState({
                user: session.user,
                session: session,
                profile: null,
                roles: [],
                isLoading: false,
                isAuthenticated: true
              });
            }
            return;
          }

          try {
            const firstName = (session.user.user_metadata?.['given_name']
              || session.user.user_metadata?.['first_name']
              || (session.user.user_metadata?.['full_name'] as string | undefined)?.split(' ')[0]
              || '');
            const lastName = (session.user.user_metadata?.['family_name']
              || session.user.user_metadata?.['last_name']
              || (session.user.user_metadata?.['full_name'] as string | undefined)?.split(' ').slice(1).join(' ')
              || '');

            if (signal?.aborted) return;

            const { data: created, error: createErr } = await supabase.functions.invoke('create-profile', {
              body: {
                user_id: session.user.id,
                email: session.user.email,
                first_name: firstName,
                last_name: lastName,
              }
            });

            if (signal?.aborted) return;

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

          if (signal?.aborted) return;

          // In ogni caso prova a ricaricare dal DB
          if (!profile) {
            profile = await fetchProfile(userId);
          }
        }

        if (signal?.aborted) return;
        updateAuthState(session, profile, signal);
      } catch (error) {
        logError('Error in fetchUserProfile', error as Error);
        if (!signal?.aborted) {
          // Ensure we stop loading state even if profile fetch fails
          // Attempt to preserve session if possible
          const { data: { session } } = await supabase.auth.getSession();
          updateAuthState(session, null, signal);
        }
      }
    } else {
      // Usa profilo cached se disponibile
      const cachedProfile = getCachedProfile(userId);
      const { data: { session } } = await supabase.auth.getSession();
      if (signal?.aborted) return;
      updateAuthState(session, cachedProfile, signal);
    }
  }, [fetchProfile, getCachedProfile, updateAuthState, debug, logError]);

  // Refresh profile forzato
  const refreshProfile = useCallback(async (): Promise<void> => {
    if (authState.user) {
      invalidateProfile(authState.user.id);
      const profile = await fetchProfile(authState.user.id);
      // Aggiorna anche i ruoli per garantire che lo stato sia coerente
      const roles = await fetchUserRoles(authState.user.id);
      setAuthState(prev => ({ ...prev, profile, roles }));
    }
  }, [authState.user, fetchProfile, invalidateProfile, fetchUserRoles]);

  useEffect(() => {
    // Main AbortController for cleanup on unmount
    const controller = new AbortController();
    const signal = controller.signal;

    // Ref to manage race conditions for pending profile fetches
    const pendingFetchController = { current: null as AbortController | null };

    const authSync = getAuthSyncChannel();
    
    // Listen for logout events from other tabs
    const unsubscribeLogout = authSync.on(AUTH_SYNC_EVENTS.LOGOUT, () => {
      if (!signal.aborted) {
        updateAuthState(null, null, signal);
        clearCache();
        window.location.href = '/login';
      }
    });

    // Listen for profile updates from other tabs
    const unsubscribeProfileUpdate = authSync.on(AUTH_SYNC_EVENTS.PROFILE_UPDATE, () => {
      if (!signal.aborted && authState.user) {
        refreshProfile();
      }
    });
    
    const initializeAuth = async () => {
      try {
        if (signal.aborted) return;

        // Check sessione esistente
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          logError('Error getting session during auth initialization', error as Error, {
            operation: 'get_session'
          });
          if (!signal.aborted) {
            updateAuthState(null, null, signal);
          }
          return;
        }

        if (session?.user && !signal.aborted) {
          currentUserId.current = session.user.id;
          const profile = await fetchProfile(session.user.id);
          if (!signal.aborted) {
            updateAuthState(session, profile, signal);
          }
        } else if (!signal.aborted) {
          updateAuthState(null, null, signal);
        }
      } catch (error) {
        logError('Auth initialization error', error as Error, {
          operation: 'auth_initialization'
        });
        if (!signal.aborted) {
          updateAuthState(null, null, signal);
        }
      } finally {
        if (!signal.aborted) {
          isInitialized.current = true;
        }
      }
    };

    // Setup auth state listener con logica ottimizzata
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (signal.aborted) return;

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

        // Handle race conditions: cancel previous pending fetch
        if (pendingFetchController.current) {
          pendingFetchController.current.abort();
        }

        // Create new controller for this specific fetch operation
        pendingFetchController.current = new AbortController();
        const currentFetchSignal = pendingFetchController.current.signal;

        if (session?.user) {
          // Pass the signal to fetchUserProfile
          fetchUserProfile(session.user.id, currentFetchSignal);
        } else {
          currentUserId.current = null;
          if (!signal.aborted) {
            updateAuthState(null, null, signal);
          }
        }
      }
    );

    // Inizializza solo se non già fatto
    if (!isInitialized.current) {
      initializeAuth();
    }

    return () => {
      // Abort main controller (stops all operations scoped to this effect)
      controller.abort();

      // Also abort any pending profile fetch specifically
      if (pendingFetchController.current) {
        pendingFetchController.current.abort();
      }

      subscription.unsubscribe();
      unsubscribeLogout();
      unsubscribeProfileUpdate();
    };
  }, [updateAuthState, fetchProfile, fetchUserProfile, authState.user, clearCache, refreshProfile, debug, logError]);

  useEffect(() => {
    const userId = authState.user?.id;

    if (!userId) {
      return;
    }

    const profileStatusChannel = supabase
      .channel(`profile-status-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<ProfileRow>) => {
          const updatedProfile = payload.new;
          const nextStatus = ('stripe_onboarding_status' in updatedProfile && isStripeOnboardingStatus(updatedProfile.stripe_onboarding_status))
            ? updatedProfile.stripe_onboarding_status
            : null;

          setAuthState((previousState) => {
            if (!previousState.profile) {
              return previousState;
            }

            const previousStatus = previousState.profile.stripe_onboarding_status;
            const nextProfile: Profile = {
              ...previousState.profile,
              ...updatedProfile,
            };

            if (previousStatus !== nextStatus) {
              if (nextStatus === 'completed') {
                toast.success('Congratulazioni! Il tuo account Host è attivo.');
              }

              if (nextStatus === 'restricted') {
                toast.error('Attenzione: Stripe ha limitato il tuo account. Controlla la dashboard.');
              }
            }

            return {
              ...previousState,
              profile: nextProfile,
            };
          });
        },
      )
      .subscribe();

    return () => {
      profileStatusChannel.unsubscribe();
      void supabase.removeChannel(profileStatusChannel);
    };
  }, [authState.user?.id]);

  return {
    authState,
    updateAuthState,
    refreshProfile,
    clearCache,
    invalidateProfile
  };
};
