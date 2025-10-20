import type { User, Session } from "@supabase/supabase-js";
import type { AuthState, Profile } from '@/types/auth';

export const createAuthState = (
  session: Session | null, 
  profile: Profile | null = null,
  roles: string[] = []
): AuthState => {
  const user = session?.user || null;
  const isAuthenticated = !!session;
  
  return {
    user,
    session,
    profile,
    roles: roles as any[],
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
  '/onboarding'
];

export const getDashboardPath = (roles: string[]): string => {
  // Priority: admin > host > default
  if (roles.includes('admin')) return '/admin/users';
  if (roles.includes('host')) return '/host/dashboard';
  return '/spaces';
};