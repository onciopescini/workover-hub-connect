
import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import AdminReportManagement from "@/components/admin/AdminReportManagement";

const AdminReportsPage = () => {
  return (
    <AdminLayout currentPage="/admin/reports">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestione Segnalazioni</h2>
      <AdminReportManagement />
    </AdminLayout>
  );
};

export default AdminReportsPage;
