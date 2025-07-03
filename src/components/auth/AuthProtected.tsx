
import { useEffect, useState, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import LoadingScreen from "@/components/LoadingScreen";

type AuthProtectedProps = {
  children: React.ReactNode;
  requireOnboarding?: boolean;
};

const AuthProtected = ({ children, requireOnboarding = true }: AuthProtectedProps) => {
  const { authState } = useAuth();
  const location = useLocation();
  const [isInitialCheck, setIsInitialCheck] = useState(true);

  // Memoized navigation decisions con logica ottimizzata
  const navigationDecision = useMemo(() => {
    // Se ancora in loading, mostra loading screen ma riduci il delay
    if (authState.isLoading && isInitialCheck) {
      return { action: 'loading' };
    }

    // Non autenticato, redirect al login
    if (!authState.isAuthenticated) {
      return { 
        action: 'redirect', 
        to: '/login', 
        state: { from: location.pathname } 
      };
    }

    // Autenticato ma profilo non caricato ancora
    if (!authState.profile) {
      return { action: 'loading' };
    }

    // Controllo onboarding solo se richiesto
    if (
      requireOnboarding &&
      !authState.profile.onboarding_completed &&
      authState.profile.role !== 'admin' &&
      location.pathname !== '/onboarding'
    ) {
      return { 
        action: 'redirect', 
        to: '/onboarding', 
        state: { from: location.pathname } 
      };
    }

    // Tutto ok, può accedere
    return { action: 'render' };
  }, [
    authState.isLoading, 
    authState.isAuthenticated, 
    authState.profile, 
    requireOnboarding, 
    location.pathname, 
    isInitialCheck
  ]);

  // Ridotto delay per initial check per migliorare UX
  useEffect(() => {
    if (!authState.isLoading && isInitialCheck) {
      const timer = setTimeout(() => setIsInitialCheck(false), 50); // Ridotto da 100ms
      return () => clearTimeout(timer);
    }
  }, [authState.isLoading, isInitialCheck]);

  // Early return ottimizzato
  if (navigationDecision.action === 'loading') {
    return <LoadingScreen />;
  }

  if (navigationDecision.action === 'redirect') {
    return <Navigate to={navigationDecision.to} state={navigationDecision.state} replace />;
  }

  return <>{children}</>;
};

export default AuthProtected;
