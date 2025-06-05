
import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminSpaceManagement } from "@/components/admin/AdminSpaceManagement";

const AdminSpacesPage = () => {
  return (
    <AdminLayout currentPage="/admin/spaces">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestione Spazi</h2>
      <AdminSpaceManagement />
    </AdminLayout>
  );
};

export default AdminSpacesPage;
