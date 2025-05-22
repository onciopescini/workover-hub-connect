
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";

type AuthProtectedProps = {
  children: React.ReactNode;
  requireOnboarding?: boolean;
};

const AuthProtected = ({ children, requireOnboarding = true }: AuthProtectedProps) => {
  const { authState } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!authState.isLoading) {
      // Small delay to prevent flash of redirects
      setTimeout(() => setIsChecking(false), 200);
    }
  }, [authState.isLoading]);

  if (isChecking || authState.isLoading) {
    return <LoadingScreen />;
  }

  // Not authenticated, redirect to login
  if (!authState.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but needs to complete onboarding
  if (
    requireOnboarding &&
    authState.profile &&
    !authState.profile.onboarding_completed
  ) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  // Authenticated and onboarding completed (or not required)
  return <>{children}</>;
};

export default AuthProtected;
