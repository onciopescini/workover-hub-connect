import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OnboardingBanner: React.FC = () => {
  const { authState } = useAuth();
  const location = useLocation();

  const shouldShow = Boolean(
    authState.isAuthenticated &&
    authState.profile &&
    !authState.profile.onboarding_completed &&
    authState.profile.role !== 'admin' &&
    location.pathname !== '/onboarding'
  );

  if (!shouldShow) return null;

  return (
    <div className="w-full bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertCircle className="w-4 h-4" />
          <span>Completa l'onboarding per sbloccare tutte le funzionalità.</span>
        </div>
        <Button asChild size="sm" variant="default">
          <Link to="/onboarding">Completa ora</Link>
        </Button>
      </div>
    </div>
  );
};

export default OnboardingBanner;
