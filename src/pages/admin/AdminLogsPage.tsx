
import React from "react";
import { AdminActionsLog } from "@/components/admin/AdminActionsLog";

const AdminLogsPage = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Log Azioni</h2>
      <AdminActionsLog />
    </div>
  );
};

export default AdminLogsPage;
