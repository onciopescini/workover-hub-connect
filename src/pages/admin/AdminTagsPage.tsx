
import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminTagManagement } from "@/components/admin/AdminTagManagement";

const AdminTagsPage = () => {
  return (
    <AdminLayout currentPage="/admin/tags">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestione Tag</h2>
      <AdminTagManagement />
    </AdminLayout>
  );
};

export default AdminTagsPage;
