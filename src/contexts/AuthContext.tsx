import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthState, Profile } from "@/types/auth";

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
};

interface AuthContextProps {
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  const { toast } = useToast();

  useEffect(() => {
    console.log("🔵 AuthProvider: Setting up auth state listeners");
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔵 Auth event:", event, "Session:", !!session);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log("🔵 User signed in, fetching profile...");
          setAuthState(prev => ({
            ...prev,
            session,
            user: session.user,
            isAuthenticated: true,
            isLoading: true, // Keep loading while fetching profile
          }));
          
          // Fetch profile with timeout
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 100);
        } else if (event === 'SIGNED_OUT') {
          console.log("🔵 User signed out, clearing state");
          setAuthState({
            session: null,
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } else if (!session) {
          console.log("🔵 No session, setting loading to false");
          setAuthState(prev => ({
            ...prev,
            session: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          }));
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log("🔵 Initial session check:", !!session, error);
      
      if (error) {
        console.error("🔴 Session error:", error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (session?.user) {
        console.log("🔵 Found existing session, fetching profile...");
        setAuthState(prev => ({
          ...prev,
          session,
          user: session.user,
          isAuthenticated: true,
          isLoading: true,
        }));
        fetchUserProfile(session.user.id);
      } else {
        console.log("🔵 No existing session, setting loading to false");
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string, forceRefresh: boolean = false) => {
    try {
      console.log("🔵 Fetching profile for user:", userId, "Force refresh:", forceRefresh);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      console.log("🔵 Profile query result:", { data, error });

      if (error) {
        console.error("🔴 Error fetching profile:", error);
        // If there's an error but user is authenticated, create a minimal profile state
        setAuthState(prev => ({
          ...prev,
          profile: null,
          isLoading: false,
        }));
        return;
      }

      console.log("🔵 Profile fetched successfully:", {
        id: data?.id,
        role: data?.role,
        stripeConnected: data?.stripe_connected,
        stripeAccountId: data?.stripe_account_id,
        onboardingCompleted: data?.onboarding_completed
      });
      
      setAuthState(prev => ({
        ...prev,
        profile: data,
        isLoading: false,
      }));
    } catch (error) {
      console.error("🔴 Exception fetching profile:", error);
      setAuthState(prev => ({
        ...prev,
        profile: null,
        isLoading: false,
      }));
    }
  };

  const refreshProfile = async () => {
    if (authState.user?.id) {
      console.log("🔵 Manual profile refresh requested");
      await fetchUserProfile(authState.user.id, true);
    }
  };

  const cleanupAuthState = () => {
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if in use
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Clean up existing auth state
      cleanupAuthState();
      
      // Try to sign out globally first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
      }
    } catch (error: any) {
      console.error("Error signing in:", error);
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Clean up existing auth state
      cleanupAuthState();
      
      // Try to sign out globally first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      toast({
        title: "Google login failed",
        description: error.message || "There was an error logging in with Google.",
        variant: "destructive",
      });
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Clean up existing auth state
      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Sign up successful",
          description: "Please check your email to confirm your account.",
        });
      }
    } catch (error: any) {
      console.error("Error signing up:", error);
      toast({
        title: "Sign up failed",
        description: error.message || "There was an error creating your account.",
        variant: "destructive",
      });
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Clean up auth state
      cleanupAuthState();
      
      // Attempt global sign out (fallback if it fails)
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      
      // Force page reload for a clean state
      window.location.href = '/';
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({
        title: "Logout failed",
        description: error.message || "There was an error logging out.",
        variant: "destructive",
      });
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const updateProfile = async (profile: Partial<Profile>) => {
    try {
      if (!authState.user) throw new Error("User not authenticated");

      console.log("🔵 Updating profile:", profile);

      const { error } = await supabase
        .from("profiles")
        .update(profile)
        .eq("id", authState.user.id);

      if (error) throw error;

      // Refresh user profile after update
      await fetchUserProfile(authState.user.id, true);

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      console.error("🔴 Error updating profile:", error);
      toast({
        title: "Profile update failed",
        description: error.message || "There was an error updating your profile.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        signIn,
        signInWithGoogle,
        signUp,
        signOut: handleSignOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
