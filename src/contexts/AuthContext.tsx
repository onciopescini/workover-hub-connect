
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthState, AuthContextType, Profile } from '@/types/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
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

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const handleRoleBasedRedirect = (profile: Profile | null, session: Session | null) => {
    if (!session || !profile) return;

    // Skip redirect if on auth-related pages
    const authPages = ['/login', '/register', '/auth/callback'];
    if (authPages.includes(location.pathname)) return;

    // Check if onboarding is needed
    if (!profile.onboarding_completed && profile.role !== 'admin') {
      if (location.pathname !== '/onboarding') {
        navigate('/onboarding');
      }
      return;
    }

    // Role-based dashboard redirects - only redirect if on root path
    if (location.pathname === '/') {
      switch (profile.role) {
        case 'admin':
          navigate('/admin/users');
          break;
        case 'host':
          navigate('/host/dashboard');
          break;
        case 'coworker':
        default:
          navigate('/spaces');
          break;
      }
    }
  };

  const updateAuthState = (session: Session | null, profile: Profile | null = null) => {
    const newState: AuthState = {
      user: session?.user || null,
      session,
      profile,
      isLoading: false,
      isAuthenticated: !!session,
    };

    setAuthState(newState);

    // Handle role-based redirect
    if (session && profile) {
      handleRoleBasedRedirect(profile, session);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, !!session);

        if (session?.user) {
          // Fetch profile for authenticated user
          const profile = await fetchProfile(session.user.id);
          updateAuthState(session, profile);
        } else {
          // No session, clear state
          updateAuthState(null);
          
          // Redirect to login if on protected route
          const protectedPaths = ['/dashboard', '/host', '/admin', '/profile', '/bookings', '/messages', '/networking'];
          if (protectedPaths.some(path => location.pathname.startsWith(path))) {
            navigate('/login');
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        updateAuthState(session, profile);
      } else {
        updateAuthState(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const profile = await fetchProfile(data.user.id);
        updateAuthState(data.session, profile);
        toast.success('Accesso effettuato con successo!');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Errore durante l\'accesso');
    }
  };

  const signUp = async (email: string, password: string): Promise<void> => {
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
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Google sign in error:', error);
      throw new Error(error.message || 'Errore durante l\'accesso con Google');
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      updateAuthState(null);
      navigate('/');
      toast.success('Logout effettuato con successo');
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Errore durante il logout');
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (authState.user) {
      const profile = await fetchProfile(authState.user.id);
      setAuthState(prev => ({ ...prev, profile }));
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<void> => {
    if (!authState.user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authState.user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Profilo aggiornato con successo');
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw new Error(error.message || 'Errore durante l\'aggiornamento del profilo');
    }
  };

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
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
