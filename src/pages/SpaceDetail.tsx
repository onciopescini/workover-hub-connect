
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { SpaceDetailContent } from '@/components/spaces/SpaceDetailContent';

const SpaceDetail = () => {
  const { authState } = useAuth();

  // Use different layouts based on authentication status
  if (authState.isAuthenticated) {
    return (
      <AppLayout>
        <SpaceDetailContent />
      </AppLayout>
    );
  }

  return (
    <PublicLayout>
      <SpaceDetailContent />
    </PublicLayout>
  );
};

export default SpaceDetail;
