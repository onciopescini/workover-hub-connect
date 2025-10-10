
import React from "react";
import { GDPRRequestsManagement } from "@/components/admin/GDPRRequestsManagement";

const AdminGDPRPage = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Gestione GDPR</h2>
      <GDPRRequestsManagement />
    </div>
  );
};

export default AdminGDPRPage;
