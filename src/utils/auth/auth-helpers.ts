import type { User, Session } from "@supabase/supabase-js";
import type { AuthState, Profile, UserRole } from '@/types/auth';

const hasProfileCriticalChanges = (previousProfile: Profile | null, nextProfile: Profile | null): boolean => {
  if (previousProfile === nextProfile) {
    return false;
  }

  if (!previousProfile || !nextProfile) {
    return previousProfile !== nextProfile;
  }

  return (
    previousProfile.id !== nextProfile.id ||
    previousProfile.updated_at !== nextProfile.updated_at ||
    previousProfile.onboarding_completed !== nextProfile.onboarding_completed ||
    previousProfile.role !== nextProfile.role ||
    previousProfile.stripe_connected !== nextProfile.stripe_connected
  );
};

export const createAuthState = (
  session: Session | null, 
  profile: Profile | null = null,
  roles: UserRole[] = []
): AuthState => {
  const user = session?.user || null;
  const isAuthenticated = !!session;
  
  return {
    user,
    session,
    profile,
    roles,
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
    hasProfileCriticalChanges(prev.profile, profile) ||
    prev.isLoading
  );
};

export const getSkipRedirectPaths = (): string[] => [
  '/login', 
  '/register', 
  '/auth/callback', 
  '/onboarding'
];

export const getDashboardPath = (roles: string[] | string): string => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  // Priority: admin > host > default
  if (roleArray.includes('admin')) return '/admin/users';
  if (roleArray.includes('host')) return '/host/dashboard';
  return '/spaces';
};
