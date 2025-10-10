
import React from "react";
import { AdminTagManagement } from "@/components/admin/AdminTagManagement";

const AdminTagsPage = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Gestione Tag</h2>
      <AdminTagManagement />
    </div>
  );
};

export default AdminTagsPage;
