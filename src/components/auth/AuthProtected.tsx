
import { useEffect, useState, useMemo, useRef } from "react";
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
  const hasCheckedAuth = useRef(false);

  // Memoized navigation decisions to prevent unnecessary recalculations
  const navigationDecision = useMemo(() => {
    if (authState.isLoading || isChecking) {
      return { action: 'loading' };
    }

    // Not authenticated, redirect to login
    if (!authState.isAuthenticated) {
      return { 
        action: 'redirect', 
        to: '/login', 
        state: { from: location } 
      };
    }

    // Authenticated but needs to complete onboarding
    if (
      requireOnboarding &&
      authState.profile &&
      !authState.profile.onboarding_completed &&
      authState.profile.role !== 'admin' // Admin can skip onboarding
    ) {
      return { 
        action: 'redirect', 
        to: '/onboarding', 
        state: { from: location } 
      };
    }

    // Authenticated and ready
    return { action: 'render' };
  }, [authState.isLoading, authState.isAuthenticated, authState.profile, requireOnboarding, location, isChecking]);

  useEffect(() => {
    if (!authState.isLoading && !hasCheckedAuth.current) {
      hasCheckedAuth.current = true;
      // Reduced delay for better performance
      const timer = setTimeout(() => setIsChecking(false), 100);
      return () => clearTimeout(timer);
    }
  }, [authState.isLoading]);

  // Early return optimization
  if (navigationDecision.action === 'loading') {
    return <LoadingScreen />;
  }

  if (navigationDecision.action === 'redirect') {
    return <Navigate to={navigationDecision.to} state={navigationDecision.state} replace />;
  }

  // Authenticated and onboarding completed (or not required)
  return <>{children}</>;
};

export default AuthProtected;
