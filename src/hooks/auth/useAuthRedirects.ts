import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Profile } from '@/types/auth';
import type { Session } from '@supabase/supabase-js';
import { getSkipRedirectPaths, getDashboardPath } from '@/utils/auth/auth-helpers';

export const useAuthRedirects = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleBasedRedirect = useCallback((profile: Profile | null, session: Session | null) => {
    if (!session || !profile) return;

    const currentPath = location.pathname;
    const skipRedirectPaths = getSkipRedirectPaths();

    // 1) Forza onboarding su tutte le pagine tranne quelle esplicitamente permesse
    if (
      !skipRedirectPaths.includes(currentPath) &&
      !profile.onboarding_completed &&
      profile.role !== 'admin' &&
      currentPath !== '/onboarding'
    ) {
      navigate('/onboarding', { replace: true });
      return;
    }

    // 2) Redirect da pagine auth se già autenticato
    if (['/login', '/register'].includes(currentPath)) {
      const dashboardPath = getDashboardPath(profile.role);
      navigate(dashboardPath, { replace: true });
      return;
    }
  }, [navigate, location.pathname]);

  return { handleRoleBasedRedirect };
};