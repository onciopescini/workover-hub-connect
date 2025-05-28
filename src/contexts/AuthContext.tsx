
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AuthState } from '@/types/auth';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

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
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const validateLinkedInUrl = (url: string): boolean => {
    if (!url || !url.trim()) return true; // Empty is valid
    
    // Più permissivo per rispettare il constraint del database
    const linkedinRegex = /^https:\/\/(www\.)?linkedin\.com\/(in|pub|profile)\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+$/i;
    return linkedinRegex.test(url);
  };

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      console.log('Profile fetched successfully:', profile);
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
    console.log('Updating auth state:', { user: !!user, session: !!session });
    
    if (user && session) {
      try {
        // Set authenticated state first
        setAuthState({
          user,
          session,
          profile: null, // Will be set after profile fetch
          isLoading: false,
          isAuthenticated: true,
        });

        // Fetch profile separately with timeout
        const profilePromise = fetchProfile(user.id);
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 5000); // 5 second timeout
        });

        const profile = await Promise.race([profilePromise, timeoutPromise]);
        
        setAuthState(prev => ({
          ...prev,
          profile
        }));

        if (!profile) {
          console.warn('Profile fetch timed out or failed, but user is authenticated');
        }
      } catch (error) {
        console.error('Error in updateAuthState:', error);
        // Still set as authenticated even if profile fetch fails
        setAuthState({
          user,
          session,
          profile: null,
          isLoading: false,
          isAuthenticated: true,
        });
      }
    } else {
      console.log('Setting unauthenticated state');
      setAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

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

    try {
      // Validate LinkedIn URL if provided
      if (userData.linkedin_url && userData.linkedin_url.trim()) {
        const linkedinUrl = userData.linkedin_url.trim();
        
        // Format URL if needed
        let formattedUrl = linkedinUrl;
        
        // Se l'utente inserisce solo il nome utente, costruisci l'URL completo
        if (!linkedinUrl.includes('linkedin.com') && !linkedinUrl.includes('http')) {
          formattedUrl = `https://linkedin.com/in/${linkedinUrl}`;
        }
        // Se manca il protocollo, aggiungilo
        else if (linkedinUrl.includes('linkedin.com') && !linkedinUrl.startsWith('http')) {
          formattedUrl = `https://${linkedinUrl}`;
        }
        // Assicurati che sia https
        else if (linkedinUrl.startsWith('http://linkedin.com')) {
          formattedUrl = linkedinUrl.replace('http://', 'https://');
        }
        
        // Validate against database constraint
        if (!validateLinkedInUrl(formattedUrl)) {
          throw new Error('URL LinkedIn non valido. Deve essere nel formato: https://linkedin.com/in/nomeutente');
        }
        
        userData.linkedin_url = formattedUrl;
      } else {
        // Set to null if empty to avoid constraint violations
        userData.linkedin_url = null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', authState.user.id)
        .select()
        .single();

      if (error) {
        console.error('Profile update error:', error);
        if (error.message.includes('profiles_linkedin_url_check')) {
          throw new Error('URL LinkedIn non valido. Controlla il formato dell\'URL.');
        }
        throw error;
      }

      // Update local state
      setAuthState(prev => ({
        ...prev,
        profile: data
      }));

      toast.success('Profilo aggiornato con successo');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Errore nell\'aggiornamento del profilo');
      throw error;
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
    let mounted = true;
    let initializationTimeout: NodeJS.Timeout;

    // Timeout to prevent infinite loading
    const setInitializationTimeout = () => {
      initializationTimeout = setTimeout(() => {
        if (mounted) {
          console.warn('Auth initialization timed out, setting loading to false');
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }, 10000); // 10 second timeout for initialization
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
  }, []);

  const value: AuthContextType = {
    authState,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
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
