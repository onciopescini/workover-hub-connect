
import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { LazyAdminDashboard } from "@/components/admin/lazy/LazyAdminDashboard";

const AdminDashboardPage = () => {
  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
      <LazyAdminDashboard />
    </AdminLayout>
  );
};

export default AdminDashboardPage;
