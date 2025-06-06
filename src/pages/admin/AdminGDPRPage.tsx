
import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { GDPRRequestsManagement } from "@/components/admin/GDPRRequestsManagement";

const AdminGDPRPage = () => {
  return (
    <AdminLayout currentPage="/admin/gdpr">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestione GDPR</h2>
      <GDPRRequestsManagement />
    </AdminLayout>
  );
};

export default AdminGDPRPage;
