import React, { Suspense } from 'react';
import { AdminDashboardState, AdminDashboardActions } from '@/hooks/admin/useAdminDashboard';
import { AdminDashboardLayout } from './AdminDashboardLayout';
import { AdminDashboardHeader } from './AdminDashboardHeader';
import { AdminDashboardWidgets } from './AdminDashboardWidgets';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

interface AdminDashboardUIProps extends AdminDashboardState, AdminDashboardActions {}

export function AdminDashboardUI({ 
  stats, 
  isLoading, 
  error, 
  refetch 
}: AdminDashboardUIProps) {
  return (
    <AdminDashboardLayout>
      <AdminDashboardHeader />
      
      <Suspense fallback={<LoadingSkeleton variant="admin" />}>
        <AdminDashboardWidgets 
          stats={stats} 
          isLoading={isLoading} 
          onRefresh={refetch} 
        />
      </Suspense>
    </AdminDashboardLayout>
  );
}