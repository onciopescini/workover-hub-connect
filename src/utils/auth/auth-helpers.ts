import type { User, Session } from "@supabase/supabase-js";
import type { AuthState, Profile } from '@/types/auth';

export const createAuthState = (
  session: Session | null, 
  profile: Profile | null = null
): AuthState => {
  const user = session?.user || null;
  const isAuthenticated = !!session;
  
  return {
    user,
    session,
    profile,
    isLoading: false,
    isAuthenticated,
  };
};

export const shouldUpdateAuthState = (
  prev: AuthState, 
  user: User | null, 
  isAuthenticated: boolean, 
  profile: Profile | null
): boolean => {
  return (
    prev.user?.id !== user?.id || 
    prev.isAuthenticated !== isAuthenticated || 
    prev.profile?.id !== profile?.id ||
    prev.isLoading
  );
};

export const getSkipRedirectPaths = (): string[] => [
  '/login', 
  '/register', 
  '/auth/callback', 
  '/', 
  '/onboarding'
];

export const getDashboardPath = (role: string): string => {
  switch (role) {
    case 'admin':
      return '/admin/users';
    case 'host':
      return '/host/dashboard';
    default:
      return '/spaces';
  }
};