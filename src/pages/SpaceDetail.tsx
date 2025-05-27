
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { MarketplaceLayout } from '@/components/layout/MarketplaceLayout';
import { SpaceDetailContent } from '@/components/spaces/SpaceDetailContent';

const SpaceDetail = () => {
  const { authState } = useAuth();

  // If user is authenticated and has completed onboarding, use MarketplaceLayout
  if (authState.isAuthenticated && authState.profile?.onboarding_completed) {
    return (
      <MarketplaceLayout>
        <SpaceDetailContent />
      </MarketplaceLayout>
    );
  }

  // If user is authenticated but hasn't completed onboarding, use AppLayout
  if (authState.isAuthenticated && !authState.profile?.onboarding_completed) {
    return (
      <AppLayout>
        <SpaceDetailContent />
      </AppLayout>
    );
  }

  // For non-authenticated users, use PublicLayout
  return (
    <PublicLayout>
      <SpaceDetailContent />
    </PublicLayout>
  );
};

export default SpaceDetail;
