import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { useLogger } from '@/hooks/useLogger';
import { toast } from 'sonner';

/**
 * AuthRedirector - The Traffic Controller
 *
 * This component listens for authentication state changes and directs users
 * to their appropriate landing page based on their role.
 *
 * Rules:
 * 1. Coworker -> /profile
 * 2. Host -> /host/dashboard
 * 3. Admin/Moderator -> /admin
 * 4. No Role -> /onboarding
 */
export const AuthRedirector = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { debug } = useLogger({ context: 'AuthRedirector' });

  // Track previous auth state to detect transitions
  const wasAuthenticated = useRef(authState.isAuthenticated);
  const previousUserId = useRef(authState.user?.id);

  useEffect(() => {
    // We only care about the transition from Unauthenticated -> Authenticated
    // OR if the user is authenticated but landed on a public page like Login/Register/Home
    // and needs to be redirected.

    const isNowAuthenticated = authState.isAuthenticated;
    const isTransitioningToAuth = !wasAuthenticated.current && isNowAuthenticated;
    const isSameUser = previousUserId.current === authState.user?.id;

    // Update refs for next render
    wasAuthenticated.current = isNowAuthenticated;
    previousUserId.current = authState.user?.id;

    if (!isNowAuthenticated) return;

    // Check if we need to redirect
    // 1. If we just logged in (transition)
    // 2. Or if we are on a "guest" page (login, register, root)
    const isGuestPage = ['/login', '/register', '/'].includes(location.pathname);

    // NOTE: We do not force redirect if user is already deep in the app (e.g. /spaces/123)
    // unless they just logged in.
    const shouldRedirect = isTransitioningToAuth || isGuestPage;

    if (!shouldRedirect) return;

    // Traffic Control Logic
    const roles = authState.roles || [];
    const profile = authState.profile;

    debug('Traffic Controller Active', { roles, path: location.pathname });

    // Case A: No Role (or incomplete)
    if (roles.length === 0) {
      if (location.pathname !== '/onboarding') {
        debug('Redirecting to Onboarding (No Role)');
        navigate('/onboarding', { replace: true });
      }
      return;
    }

    // Case B: Admin / Moderator
    if (roles.includes('admin') || roles.includes('moderator')) {
      if (!location.pathname.startsWith('/admin')) {
         debug('Redirecting to Admin Panel');
         navigate('/admin', { replace: true });
      }
      return;
    }

    // Case C: Host
    if (roles.includes('host')) {
      if (!location.pathname.startsWith('/host')) {
        debug('Redirecting to Host Dashboard');
        navigate('/host/dashboard', { replace: true });
      }
      return;
    }

    // Case D: Coworker
    if (roles.includes('coworker')) {
      // For coworkers, we want to send them to /profile ONLY if they are on a guest page
      // If they are deep linking (e.g. to a booking), we let them pass.
      if (isGuestPage) {
        debug('Redirecting to Profile (Coworker)');
        navigate('/profile', { replace: true });
      }
      return;
    }

    // Fallback
    debug('No specific rule matched, staying on current route', { path: location.pathname });

  }, [
    authState.isAuthenticated,
    authState.user?.id,
    authState.roles,
    location.pathname,
    navigate,
    debug
  ]);

  return null;
};
