import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { useLogger } from '@/hooks/useLogger';

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

  // Guard against redirect loops
  const lastRedirectPath = useRef<string | null>(null);
  const lastRedirectTime = useRef<number>(0);
  const REDIRECT_COOLDOWN_MS = 2000;

  useEffect(() => {
    // We only care about the transition from Unauthenticated -> Authenticated
    // OR if the user is authenticated but landed on a public page like Login/Register/Home
    // and needs to be redirected.

    const isNowAuthenticated = authState.isAuthenticated;
    const isTransitioningToAuth = !wasAuthenticated.current && isNowAuthenticated;
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

    // Safety check: ensure roles are loaded or we handle the empty case
    // If roles are loading, we shouldn't redirect yet?
    // Usually authState.isAuthenticated is true only after initial load.

    debug('Traffic Controller Active', { roles, path: location.pathname });

    let targetPath: string | null = null;

    // Case A: No Role (or incomplete)
    if (roles.length === 0) {
      // Changed from /onboarding to /profile to allow safe landing
      targetPath = '/profile';
    }
    // Case B: Admin / Moderator
    else if (roles.includes('admin') || roles.includes('moderator')) {
      if (!location.pathname.startsWith('/admin')) {
         targetPath = '/admin';
      }
    }
    // Case C: Host
    else if (roles.includes('host')) {
      if (!location.pathname.startsWith('/host')) {
        targetPath = '/host/dashboard';
      }
    }
    // Case D: Coworker
    else if (roles.includes('coworker')) {
      // For coworkers, we want to send them to /profile ONLY if they are on a guest page
      // If they are deep linking (e.g. to a booking), we let them pass.
      if (isGuestPage) {
        targetPath = '/profile';
      }
    }

    // Execute Redirect with Guard
    if (targetPath && location.pathname !== targetPath) {
      const now = Date.now();

      // If we are trying to redirect to the same place we just redirected to
      // within the cooldown window, block it.
      if (
        lastRedirectPath.current === targetPath &&
        (now - lastRedirectTime.current) < REDIRECT_COOLDOWN_MS
      ) {
        debug('Blocked rapid redirect loop', { targetPath });
        return;
      }

      debug(`Redirecting to ${targetPath}`);
      lastRedirectPath.current = targetPath;
      lastRedirectTime.current = now;
      navigate(targetPath, { replace: true });
    } else {
       debug('No specific rule matched or already on target path', { path: location.pathname });
    }

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
