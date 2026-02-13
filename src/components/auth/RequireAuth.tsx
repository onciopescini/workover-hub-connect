import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/hooks/auth/useAuth';

interface RequireAuthProps {
  children: ReactNode;
}

const RequireAuth = ({ children }: RequireAuthProps) => {
  const { authState } = useAuth();
  const location = useLocation();

  if (authState.isLoading) {
    return <LoadingScreen />;
  }

  if (!authState.isAuthenticated) {
    const returnUrl = `${location.pathname}${location.search}`;
    const loginUrl = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;

    return <Navigate to={loginUrl} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
