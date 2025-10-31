
import React, { lazy, Suspense } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { LazyAdminDashboard } from "@/components/admin/lazy/LazyAdminDashboard";

const AdminOverviewStitch = lazy(() => import('@/feature/admin/AdminOverviewStitch'));

const AdminDashboardPage = () => {
  const isStitch = import.meta.env.VITE_UI_THEME === 'stitch';

  const dashboardContent = (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
      <LazyAdminDashboard />
    </>
  );

  return (
    <AdminLayout>
      {isStitch ? (
        <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg)]" />}>
          <AdminOverviewStitch>
            {dashboardContent}
          </AdminOverviewStitch>
        </Suspense>
      ) : (
        dashboardContent
      )}
    </AdminLayout>
  );
};

export default AdminDashboardPage;
