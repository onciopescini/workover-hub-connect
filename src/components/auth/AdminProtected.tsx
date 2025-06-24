
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import { isCurrentUserAdmin } from "@/lib/admin-utils";

type AdminProtectedProps = {
  children: React.ReactNode;
};

const AdminProtected = ({ children }: AdminProtectedProps) => {
  const { authState } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!authState.isLoading && !authState.isAuthenticated) {
        setIsAdmin(false);
        setIsChecking(false);
        return;
      }

      if (!authState.isLoading && authState.isAuthenticated) {
        try {
          const adminStatus = await isCurrentUserAdmin();
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        } finally {
          setIsChecking(false);
        }
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
