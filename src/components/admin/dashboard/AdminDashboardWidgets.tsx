import React, { lazy, Suspense } from 'react';
import { AdminStats } from '@/types/admin';
import { Loader2 } from 'lucide-react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

// Lazy load heavy widgets
const LazyAdminStatsCards = lazy(() => 
  import('./AdminStatsCards').then(module => ({ default: module.AdminStatsCards }))
);

const LazyAdminRevenueCard = lazy(() => 
  import('./AdminRevenueCard').then(module => ({ default: module.AdminRevenueCard }))
);

const LazyAdminQuickActionsCard = lazy(() => 
  import('./AdminQuickActionsCard').then(module => ({ default: module.AdminQuickActionsCard }))
);

interface AdminDashboardWidgetsProps {
  stats: AdminStats | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function AdminDashboardWidgets({ stats, isLoading, onRefresh }: AdminDashboardWidgetsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Errore nel caricamento delle statistiche</p>
        <button 
          onClick={onRefresh}
          className="mt-2 text-blue-600 hover:text-blue-800"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<LoadingSkeleton variant="admin" />}>
        <LazyAdminStatsCards stats={stats} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<LoadingSkeleton variant="admin" />}>
          <LazyAdminRevenueCard stats={stats} />
        </Suspense>

        <Suspense fallback={<LoadingSkeleton variant="admin" />}>
          <LazyAdminQuickActionsCard stats={stats} />
        </Suspense>
      </div>
    </>
  );
}