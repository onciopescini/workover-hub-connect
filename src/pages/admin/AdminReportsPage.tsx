
import React from "react";
import AdminReportManagement from "@/components/admin/AdminReportManagement";

const AdminReportsPage = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Gestione Segnalazioni</h2>
      <AdminReportManagement />
    </div>
  );
};

export default AdminReportsPage;
