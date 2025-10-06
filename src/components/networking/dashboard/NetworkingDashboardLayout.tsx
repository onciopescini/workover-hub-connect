import React from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

interface NetworkingDashboardLayoutProps {
  children: React.ReactNode;
}

export function NetworkingDashboardLayout({ children }: NetworkingDashboardLayoutProps) {
  return (
    <div className="space-y-6">
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </div>
  );
}