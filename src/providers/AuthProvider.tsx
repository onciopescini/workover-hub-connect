import React, { ReactNode, useMemo } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useAuthLogic } from '@/hooks/auth/useAuthLogic';
import { useAuthMethods } from '@/hooks/auth/useAuthMethods';
import { useProfileCache } from '@/hooks/auth/useProfileCache';
import type { AuthContextType } from '@/types/auth';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { fetchProfile, invalidateProfile, clearCache } = useProfileCache();
  const { 
    authState, 
    updateAuthState, 
    refreshProfile 
  } = useAuthLogic();

  const authMethods = useAuthMethods({
    fetchProfile,
    updateAuthState,
    refreshProfile,
    clearCache,
    invalidateProfile,
    currentUser: authState.user
  });

  // MEMOIZE the context value to prevent unnecessary re-renders
  const contextValue = useMemo<AuthContextType>(() => ({
    authState,
    ...authMethods,
    refreshProfile
  }), [authState, authMethods, refreshProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};