
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import { UserRole } from "@/types/auth";

interface RoleProtectedProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const RoleProtected = ({ children, allowedRoles }: RoleProtectedProps) => {
  const { authState } = useAuth();

  if (authState.isLoading) {
    return <LoadingScreen />;
  }

  if (!authState.profile?.role) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!allowedRoles.includes(authState.profile.role)) {
    // Redirect to appropriate dashboard based on role
    const redirectTo = authState.profile.role === "admin" ? "/admin" :
                      authState.profile.role === "host" ? "/host/dashboard" : 
                      "/app/spaces"; // Unified redirect for coworkers
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default RoleProtected;
