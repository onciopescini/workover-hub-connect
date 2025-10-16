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

    // FASE 3: Guard specifica per HOST incompleti
    if (
      profile.role === 'host' &&
      currentPath !== '/host/onboarding' &&
      !skipRedirectPaths.includes(currentPath)
    ) {
      // Case 1: onboarding_completed explicitly false
      if (profile.onboarding_completed === false) {
        navigate('/host/onboarding', { replace: true });
        return;
      }
      
      // Case 2: onboarding_completed=true but critical data missing (false positive)
      const hasStripe = profile.stripe_connected === true;
      const hasFiscal = !!(profile.fiscal_regime && profile.iban);
      
      if (profile.onboarding_completed === true && (!hasStripe || !hasFiscal)) {
        // ❌ NO DB update from hook (avoids race conditions)
        // Only redirect; flag reset will be handled by SQL backfill
        console.warn('Host with onboarding_completed=true but incomplete data, forcing redirect');
        navigate('/host/onboarding', { replace: true });
        return;
      }
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