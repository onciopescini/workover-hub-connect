
import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminUserManagement } from "@/components/admin/AdminUserManagement";

const AdminUsersPage = () => {
  return (
    <AdminLayout currentPage="/admin/users">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestione Utenti</h2>
      <AdminUserManagement />
    </AdminLayout>
  );
};

export default AdminUsersPage;
