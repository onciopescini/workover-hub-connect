
import { useEffect, useState, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/auth/useAuth";
import LoadingScreen from "@/components/LoadingScreen";

type AuthProtectedProps = {
  children: React.ReactNode;
  requireOnboarding?: boolean;
};

const AuthProtected = ({ children, requireOnboarding = true }: AuthProtectedProps) => {
  const { authState } = useAuth();
  const location = useLocation();
  const [isInitialCheck, setIsInitialCheck] = useState(true);
  const [profileLoadTimeout, setProfileLoadTimeout] = useState(false);

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
    // Check if onboarding is truly completed or if basic profile info exists (fallback)
    const hasCompletedOnboarding =
      authState.profile.onboarding_completed === true ||
      (!!authState.profile.first_name && !!authState.profile.last_name);

    if (
      requireOnboarding &&
      !hasCompletedOnboarding &&
      !authState.roles.includes('admin') &&
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
      const timer = setTimeout(() => setIsInitialCheck(false), 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [authState.isLoading, isInitialCheck]);

  // Timeout per evitare spinner infiniti se il profilo non si carica
  useEffect(() => {
    if (authState.isAuthenticated && !authState.profile && !authState.isLoading) {
      const timeout = setTimeout(() => {
        setProfileLoadTimeout(true);
      }, 10000); // 10 secondi timeout
      
      return () => clearTimeout(timeout);
    } else {
      setProfileLoadTimeout(false);
      return undefined;
    }
  }, [authState.isAuthenticated, authState.profile, authState.isLoading]);

  // Early return ottimizzato
  if (navigationDecision.action === 'loading') {
    return <LoadingScreen />;
  }

  if (navigationDecision.action === 'redirect') {
    return <Navigate to={navigationDecision.to ?? '/login'} state={navigationDecision.state} replace />;
  }

  // Timeout fallback per evitare spinner infiniti
  if (profileLoadTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full px-6 py-8 bg-card rounded-lg shadow-lg text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Impossibile caricare il profilo</h2>
          <p className="text-muted-foreground">
            Si è verificato un errore nel caricamento dei tuoi dati. 
            Prova a ricaricare la pagina o effettua nuovamente il login.
          </p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Ricarica pagina
            </button>
            <button 
              onClick={() => window.location.href = '/login'} 
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Torna al login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthProtected;
