
import React from "react";
import AdminUserManagement from "@/components/admin/AdminUserManagement";

const AdminUsersPage = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Gestione Utenti</h2>
      <AdminUserManagement />
    </div>
  );
};

export default AdminUsersPage;
