
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AuthState } from '@/types/auth';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return profile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (!authState.user) return;
    
    try {
      const profile = await fetchProfile(authState.user.id);
      setAuthState(prev => ({
        ...prev,
        profile
      }));
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const updateAuthState = async (user: User | null, session: Session | null) => {
    if (user && session) {
      const profile = await fetchProfile(user.id);
      setAuthState({
        user,
        session,
        profile,
        isLoading: false,
        isAuthenticated: true,
      });
    } else {
      setAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
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
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        await updateAuthState(session?.user || null, session);
      } catch (error) {
        console.error('Error getting initial session:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        await updateAuthState(session?.user || null, session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    ...authState,
    signOut,
    refreshProfile,
  };

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
