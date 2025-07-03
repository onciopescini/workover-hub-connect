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
    
    // Skip redirect se siamo già nella pagina corretta o su pagine che non richiedono redirect
    if (skipRedirectPaths.includes(currentPath)) {
      
      // Solo redirect necessari per onboarding
      if (!profile.onboarding_completed && profile.role !== 'admin' && currentPath !== '/onboarding') {
        navigate('/onboarding', { replace: true });
        return;
      }

      // Redirect da pagine auth solo se necessario
      if (['/login', '/register'].includes(currentPath)) {
        const dashboardPath = getDashboardPath(profile.role);
        navigate(dashboardPath, { replace: true });
      }
    }
  }, [navigate, location.pathname]);

  return { handleRoleBasedRedirect };
};