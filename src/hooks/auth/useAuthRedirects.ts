import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Profile, UserRole } from '@/types/auth';
import type { Session } from '@supabase/supabase-js';
import { getSkipRedirectPaths, getDashboardPath } from '@/utils/auth/auth-helpers';
import { getPrimaryRole } from '@/lib/auth/role-utils';

export const useAuthRedirects = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleBasedRedirect = useCallback((profile: Profile | null, session: Session | null, roles: UserRole[] = []) => {
    if (!session || !profile) return;

    const currentPath = location.pathname;
    const skipRedirectPaths = getSkipRedirectPaths();

    const primaryRole = getPrimaryRole(roles);
    
    // 1) Forza onboarding su tutte le pagine tranne quelle esplicitamente permesse
    // CRITICAL FIX: Allow access to /host/dashboard even if onboarding_completed is false (or stale)
    // to prevent redirect loops and allow data refresh.
    if (
      !skipRedirectPaths.includes(currentPath) &&
      !profile.onboarding_completed &&
      primaryRole !== 'admin' &&
      currentPath !== '/onboarding' &&
      !currentPath.startsWith('/host/dashboard')
    ) {
      navigate('/onboarding', { replace: true });
      return;
    }


    // 2) Redirect da pagine auth se già autenticato
    if (['/login', '/register'].includes(currentPath)) {
      const dashboardPath = getDashboardPath(primaryRole);
      navigate(dashboardPath, { replace: true });
      return;
    }
  }, [navigate, location.pathname]);

  return { handleRoleBasedRedirect };
};