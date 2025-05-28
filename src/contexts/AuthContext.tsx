
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AuthState } from '@/types/auth';
import { useAuthState } from '@/hooks/useAuthState';
import { useOptimizedProfile } from '@/hooks/useOptimizedProfile';

interface AuthContextType {
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData?: any) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (userData: any) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { authState, setAuthState, updateAuthState, refreshProfile } = useAuthState();
  const { updateProfile: updateUserProfile } = useOptimizedProfile();

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // State will be updated by onAuthStateChange
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Errore durante il login');
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData || {}
        }
      });

      if (error) throw error;
      // State will be updated by onAuthStateChange
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Errore durante la registrazione');
    }
  };

  const signInWithGoogle = async () => {
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
      throw new Error(error.message || 'Errore durante il login con Google');
    }
  };

  const updateProfile = async (userData: any) => {
    if (!authState.user) {
      throw new Error('Utente non autenticato');
    }

    const updatedProfile = await updateUserProfile(authState.user.id, userData);
    
    // Update local state
    setAuthState(prev => ({
      ...prev,
      profile: updatedProfile
    }));
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear auth state immediately
      setAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  };

  useEffect(() => {
    let mounted = true;
    let initializationTimeout: NodeJS.Timeout;

    // Timeout to prevent infinite loading
    const setInitializationTimeout = () => {
      initializationTimeout = setTimeout(() => {
        if (mounted) {
          console.warn('Auth initialization timed out, setting loading to false');
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }, 10000);
    };

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (mounted) {
          clearTimeout(initializationTimeout);
          await updateAuthState(session?.user || null, session);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          clearTimeout(initializationTimeout);
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    // Start timeout
    setInitializationTimeout();
    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        if (mounted) {
          clearTimeout(initializationTimeout);
          await updateAuthState(session?.user || null, session);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(initializationTimeout);
      subscription.unsubscribe();
    };
  }, []); // Rimuovo updateAuthState dalle dipendenze per evitare loop

  // Memoize the context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(() => ({
    authState,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshProfile,
  }), [authState, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
