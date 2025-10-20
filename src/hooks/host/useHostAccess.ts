import { useMemo } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { AccessStatus } from '@/types/host/access.types';
import { hasAnyRole } from '@/lib/auth/role-utils';

export const useHostAccess = () => {
  const { authState } = useAuth();

  const accessStatus: AccessStatus = useMemo(() => {
    if (authState.isLoading) return 'loading';
    if (!authState.isAuthenticated) return 'unauthenticated';
    if (!hasAnyRole(authState.roles, ['host', 'admin'])) {
      return 'unauthorized';
    }
    return 'authorized';
  }, [authState.isLoading, authState.isAuthenticated, authState.roles]);

  return {
    accessStatus,
    authState,
    isLoading: authState.isLoading,
    isAuthorized: accessStatus === 'authorized',
    firstName: authState.profile?.first_name
  };
};