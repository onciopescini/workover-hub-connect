import React, { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

const AdminDashboard = React.lazy(() => 
  import('../AdminDashboard').then(module => ({
    default: module.AdminDashboard
  }))
);

export function LazyAdminDashboard() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="admin" />}>
      <AdminDashboard />
    </Suspense>
  );
}