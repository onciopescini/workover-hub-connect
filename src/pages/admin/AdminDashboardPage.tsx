
import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

const AdminDashboardPage = () => {
  return (
    <AdminLayout currentPage="/admin">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
      <AdminDashboard />
    </AdminLayout>
  );
};

export default AdminDashboardPage;
