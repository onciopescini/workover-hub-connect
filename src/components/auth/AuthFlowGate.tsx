import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/hooks/auth/useAuth';

interface AuthFlowGateProps {
  children?: ReactNode;
  requireOnboarding?: boolean;
}

const isSafeReturnUrl = (candidate: string | null): candidate is string => {
  if (!candidate) {
    return false;
  }

  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return false;
  }

  return !candidate.startsWith('/auth/callback');
};

const buildReturnUrl = (pathname: string, search: string, hash: string): string => {
  return `${pathname}${search}${hash}`;
};

const getDefaultPath = (roles: string[]): string => {
  if (roles.includes('coworker') || roles.includes('user')) {
    return '/spaces';
  }

  return '/dashboard';
};

const AuthFlowGate = ({ children, requireOnboarding = true }: AuthFlowGateProps) => {
  const { authState } = useAuth();
  const location = useLocation();

  if (authState.isLoading) {
    return <LoadingScreen />;
  }

  if (!authState.session) {
    const returnUrl = buildReturnUrl(location.pathname, location.search, location.hash);
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} replace />;
  }

  if (!authState.profile) {
    return <LoadingScreen />;
  }

  const locationState = location.state as { returnUrl?: string } | null;
  const stateReturnUrl = locationState?.returnUrl ?? null;
  const queryReturnUrl = new URLSearchParams(location.search).get('returnUrl');
  const validReturnUrl = isSafeReturnUrl(stateReturnUrl)
    ? stateReturnUrl
    : isSafeReturnUrl(queryReturnUrl)
      ? queryReturnUrl
      : null;

  if (validReturnUrl && validReturnUrl !== location.pathname) {
    return <Navigate to={validReturnUrl} replace />;
  }

  if (
    requireOnboarding &&
    !authState.profile.onboarding_completed &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!children) {
    const defaultPath = getDefaultPath(authState.roles);
    if (location.pathname !== defaultPath) {
      return <Navigate to={defaultPath} replace />;
    }
  }

  return <>{children}</>;
};

export default AuthFlowGate;
