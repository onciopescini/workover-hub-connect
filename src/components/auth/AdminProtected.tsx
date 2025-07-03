
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/auth/useAuth";
import LoadingScreen from "@/components/LoadingScreen";
import { isCurrentUserAdmin } from "@/lib/admin-utils";
import { useErrorHandler } from "@/hooks/useErrorHandler";

type AdminProtectedProps = {
  children: React.ReactNode;
};

const AdminProtected = ({ children }: AdminProtectedProps) => {
  const { authState } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const { handleAsyncError } = useErrorHandler('AdminProtected');

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!authState.isLoading && !authState.isAuthenticated) {
        setIsAdmin(false);
        setIsChecking(false);
        return;
      }

      if (!authState.isLoading && authState.isAuthenticated) {
        const adminStatus = await handleAsyncError(async () => {
          return await isCurrentUserAdmin();
        }, { 
          context: 'check_admin_status',
          showToast: false // Don't show toast for auth checks
        });

        setIsAdmin(adminStatus ?? false);
        setIsChecking(false);
      }
    };

    checkAdminAccess();
  }, [authState.isLoading, authState.isAuthenticated]);

  // Show loading screen while checking admin status
  if (isChecking || authState.isLoading) {
    return <LoadingScreen />;
  }

  // Redirect to unauthorized page if not an admin
  if (isAdmin === false) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Allow access if admin
  return <>{children}</>;
};

export default AdminProtected;
