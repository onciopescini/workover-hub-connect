
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthState, AuthContextType, Profile } from '@/types/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { aggressiveSignOut, cleanSignIn, cleanSignInWithGoogle } from '@/lib/auth-utils';

const OptimizedAuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(OptimizedAuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const OptimizedAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const navigate = useNavigate();
  const location = useLocation();
  
  // Ref per evitare re-render eccessivi e race conditions
  const isInitialized = useRef(false);
  const currentUserId = useRef<string | null>(null);
  const profileCache = useRef<Map<string, Profile>>(new Map());
  const lastProfileFetch = useRef<number>(0);

  // Debounced profile fetch per evitare chiamate eccessive
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    // Debounce aggressivo - non più di una chiamata ogni 5 secondi
    const now = Date.now();
    if (now - lastProfileFetch.current < 5000 && profileCache.current.has(userId)) {
      return profileCache.current.get(userId) || null;
    }
    
    lastProfileFetch.current = now;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      // Cache del profilo
      if (data) {
        profileCache.current.set(userId, data);
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  // Logica di redirect semplificata e ottimizzata
  const handleRoleBasedRedirect = useCallback((profile: Profile | null, session: Session | null) => {
    if (!session || !profile) return;

    const currentPath = location.pathname;
    
    // Skip redirect se siamo già nella pagina corretta o su pagine che non richiedono redirect
    const skipRedirectPaths = ['/login', '/register', '/auth/callback', '/', '/onboarding'];
    if (skipRedirectPaths.includes(currentPath)) {
      
      // Solo redirect necessari per onboarding
      if (!profile.onboarding_completed && profile.role !== 'admin' && currentPath !== '/onboarding') {
        navigate('/onboarding', { replace: true });
        return;
      }

      // Redirect da pagine auth solo se necessario
      if (['/login', '/register'].includes(currentPath)) {
        const dashboardPath = profile.role === 'admin' ? '/admin/users' :
                             profile.role === 'host' ? '/host/dashboard' : '/spaces';
        navigate(dashboardPath, { replace: true });
      }
    }
  }, [navigate, location.pathname]);

  // Funzione ottimizzata per aggiornare lo stato auth
  const updateAuthState = useCallback((session: Session | null, profile: Profile | null = null) => {
    const user = session?.user || null;
    const isAuthenticated = !!session;
    
    // Aggiorna solo se necessario per evitare re-render
    setAuthState(prev => {
      if (prev.user?.id === user?.id && 
          prev.isAuthenticated === isAuthenticated && 
          prev.profile?.id === profile?.id &&
          !prev.isLoading) {
        return prev;
      }

      return {
        user,
        session,
        profile,
        isLoading: false,
        isAuthenticated,
      };
    });

    // Gestisci redirect solo se necessario
    if (session && profile) {
      setTimeout(() => handleRoleBasedRedirect(profile, session), 0);
    }
  }, [handleRoleBasedRedirect]);

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
          const userId = session.user.id;
          
          // Evita fetch profilo duplicati
          if (currentUserId.current !== userId) {
            currentUserId.current = userId;
            
            // Defer profile fetch per evitare deadlock
            setTimeout(async () => {
              if (mounted) {
                const profile = await fetchProfile(userId);
                if (mounted) {
                  updateAuthState(session, profile);
                }
              }
            }, 0);
          } else {
            // Usa profilo cached se disponibile
            const cachedProfile = profileCache.current.get(userId);
            if (mounted) {
              updateAuthState(session, cachedProfile || null);
            }
          }
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
  }, [updateAuthState, fetchProfile]);

  // Metodi auth ottimizzati
  const signIn = useCallback(async (email: string, password: string, redirectTo?: string): Promise<void> => {
    try {
      const data = await cleanSignIn(email, password);

      if (data.user) {
        currentUserId.current = data.user.id;
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
      currentUserId.current = null;
      profileCache.current.clear();
      await aggressiveSignOut();
      toast.success('Logout effettuato con successo');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.success('Logout effettuato con successo');
      throw new Error(error.message || 'Errore durante il logout');
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (authState.user) {
      // Forza refresh del profilo
      profileCache.current.delete(authState.user.id);
      const profile = await fetchProfile(authState.user.id);
      setAuthState(prev => ({ ...prev, profile }));
    }
  }, [authState.user, fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>): Promise<void> => {
    if (!authState.user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authState.user.id);

      if (error) throw error;

      // Invalida cache e ricarica
      profileCache.current.delete(authState.user.id);
      await refreshProfile();
      toast.success('Profilo aggiornato con successo');
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw new Error(error.message || 'Errore durante l\'aggiornamento del profilo');
    }
  }, [authState.user, refreshProfile]);

  const contextValue: AuthContextType = {
    authState,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
    updateProfile,
  };

  return (
    <OptimizedAuthContext.Provider value={contextValue}>
      {children}
    </OptimizedAuthContext.Provider>
  );
};
