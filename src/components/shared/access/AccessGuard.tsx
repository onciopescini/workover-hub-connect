import { useAuth } from '@/hooks/auth/useAuth';
import { AccessGuardProps } from '@/types/host/access.types';
import { AccessDenied } from './AccessDenied';
import { LoadingSkeleton } from './LoadingSkeleton';

export const AccessGuard = ({ 
  requiredRoles = ['host', 'admin'], 
  loadingFallback, 
  deniedFallback, 
  children 
}: AccessGuardProps) => {
  const { authState } = useAuth();

  // Loading state
  if (authState.isLoading) {
    return loadingFallback || <LoadingSkeleton />;
  }

  // Unauthenticated
  if (!authState.isAuthenticated) {
    return deniedFallback || (
      <AccessDenied 
        variant="unauthenticated" 
        actionButton={{ text: "Effettua il Login", href: "/login" }}
      />
    );
  }

  // Unauthorized (wrong role)
  if (!requiredRoles.includes(authState.profile?.role || '')) {
    return deniedFallback || (
      <AccessDenied 
        variant="unauthorized" 
        actionButton={{ text: "Torna alla Dashboard", href: "/dashboard" }}
      />
    );
  }

  // Authorized
  return <>{children}</>;
};