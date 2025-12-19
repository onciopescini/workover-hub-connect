import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { useLogger } from '@/hooks/useLogger';

export const LimboGuard = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { debug } = useLogger({ context: 'LimboGuard' });

  useEffect(() => {
    // Wait for auth to initialize
    if (authState.isLoading) return;

    // Check if user is authenticated but has no roles (Limbo state)
    const isLimboUser =
      authState.isAuthenticated &&
      authState.user &&
      (!authState.roles || authState.roles.length === 0);

    // If Limbo user is not on onboarding page, force redirect
    if (isLimboUser && location.pathname !== '/onboarding') {
      debug('Redirecting Limbo user to /onboarding', {
        path: location.pathname,
        userId: authState.user?.id
      });
      navigate('/onboarding', { replace: true });
    }
  }, [
    authState.isLoading,
    authState.isAuthenticated,
    authState.user,
    authState.roles,
    location.pathname,
    navigate,
    debug
  ]);

  return null;
};
