
import { useMemo } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { Navigate } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import { UserRole } from "@/types/auth";
import { getPrimaryRole, hasAnyRole } from "@/lib/auth/role-utils";

interface RoleProtectedProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const RoleProtected = ({ children, allowedRoles }: RoleProtectedProps) => {
  const { authState } = useAuth();

  // Memoized role-based routing decision
  const routingDecision = useMemo(() => {
    if (authState.isLoading) {
      return { action: 'loading' };
    }

    if (authState.roles.length === 0) {
      return { 
        action: 'redirect', 
        to: '/onboarding' 
      };
    }

    if (!hasAnyRole(authState.roles, allowedRoles)) {
      // Redirect to appropriate dashboard based on role
      const primaryRole = getPrimaryRole(authState.roles);
      const redirectTo = primaryRole === "admin" ? "/admin" :
                        primaryRole === "host" ? "/host/dashboard" : 
                        "/spaces"; // Unified redirect for coworkers
      return { 
        action: 'redirect', 
        to: redirectTo 
      };
    }

    return { action: 'render' };
  }, [authState.isLoading, authState.roles, allowedRoles]);

  if (routingDecision.action === 'loading') {
    return <LoadingScreen />;
  }

  if (routingDecision.action === 'redirect') {
    return <Navigate to={routingDecision.to ?? '/onboarding'} replace />;
  }

  return <>{children}</>;
};

export default RoleProtected;
