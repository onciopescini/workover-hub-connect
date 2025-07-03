import { useMemo } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { AccessStatus } from '@/types/host/access.types';

export const useHostAccess = () => {
  const { authState } = useAuth();

  const accessStatus: AccessStatus = useMemo(() => {
    if (authState.isLoading) return 'loading';
    if (!authState.isAuthenticated) return 'unauthenticated';
    if (authState.profile?.role !== 'host' && authState.profile?.role !== 'admin') {
      return 'unauthorized';
    }
    return 'authorized';
  }, [authState.isLoading, authState.isAuthenticated, authState.profile?.role]);

  return {
    accessStatus,
    authState,
    isLoading: authState.isLoading,
    isAuthorized: accessStatus === 'authorized',
    firstName: authState.profile?.first_name
  };
};