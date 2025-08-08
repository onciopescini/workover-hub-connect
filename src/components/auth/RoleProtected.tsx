
import { useMemo } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { Navigate } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import { UserRole } from "@/types/auth";

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

    if (!authState.profile?.role) {
      return { 
        action: 'redirect', 
        to: '/onboarding' 
      };
    }

    if (!allowedRoles.includes(authState.profile.role)) {
      // Redirect to appropriate dashboard based on role
      const redirectTo = authState.profile.role === "admin" ? "/admin" :
                        authState.profile.role === "host" ? "/host/dashboard" : 
                        "/spaces"; // Unified redirect for coworkers
      return { 
        action: 'redirect', 
        to: redirectTo 
      };
    }

    return { action: 'render' };
  }, [authState.isLoading, authState.profile?.role, allowedRoles]);

  if (routingDecision.action === 'loading') {
    return <LoadingScreen />;
  }

  if (routingDecision.action === 'redirect') {
    return <Navigate to={routingDecision.to ?? '/onboarding'} replace />;
  }

  return <>{children}</>;
};

export default RoleProtected;
