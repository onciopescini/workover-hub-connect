import React from 'react';
import { useAdminDashboard } from '@/hooks/admin/useAdminDashboard';
import { AdminDashboardUI } from './AdminDashboardUI';
import { AdminDashboardError } from './AdminDashboardError';

export function AdminDashboardContainer() {
  const dashboardState = useAdminDashboard();

  if (dashboardState.error) {
    return <AdminDashboardError onRefresh={dashboardState.refetch} />;
  }

  return <AdminDashboardUI {...dashboardState} />;
}