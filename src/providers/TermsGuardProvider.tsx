import React, { ReactNode } from 'react';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import { TermsAcceptanceModal } from '@/components/legal/TermsAcceptanceModal';
import { useAuth } from '@/hooks/auth/useAuth';

interface TermsGuardProviderProps {
  children: ReactNode;
}

export const TermsGuardProvider: React.FC<TermsGuardProviderProps> = ({ children }) => {
  const { authState } = useAuth();
  const { isLoading, needsAcceptance, latestVersion, acceptTerms } = useTermsAcceptance();

  // Only show modal for authenticated users who need to accept
  const showModal = authState.isAuthenticated && 
                   !authState.isLoading && 
                   !isLoading && 
                   needsAcceptance;

  return (
    <>
      {children}
      <TermsAcceptanceModal
        isOpen={showModal}
        version={latestVersion || '1.0'}
        onAccept={acceptTerms}
        isLoading={isLoading}
      />
    </>
  );
};
