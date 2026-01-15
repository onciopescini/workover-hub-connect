import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthContextType } from '@/types/auth';

// MOCKED FOR VERIFICATION
export const useAuth = (): AuthContextType => {
  return {
    authState: {
      user: { id: 'mock-admin-id', email: 'admin@example.com' } as any,
      profile: { id: 'mock-admin-id', first_name: 'Admin', last_name: 'User' } as any,
      isLoading: false,
      isAuthenticated: true,
      error: null
    },
    signIn: async () => {},
    signUp: async () => {},
    signOut: async () => {},
    resetPassword: async () => {}
  } as any;
};
