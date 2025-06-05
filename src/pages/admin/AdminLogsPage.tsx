
import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminActionsLog } from "@/components/admin/AdminActionsLog";

const AdminLogsPage = () => {
  return (
    <AdminLayout currentPage="/admin/logs">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Log Azioni</h2>
      <AdminActionsLog />
    </AdminLayout>
  );
};

export default AdminLogsPage;
