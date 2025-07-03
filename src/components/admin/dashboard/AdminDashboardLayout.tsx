import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
}

export function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  return (
    <div className="space-y-6">
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </div>
  );
}