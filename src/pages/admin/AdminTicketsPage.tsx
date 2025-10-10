
import React from "react";
import { AdminTicketManagement } from "@/components/admin/AdminTicketManagement";

const AdminTicketsPage = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Gestione Ticket</h2>
      <AdminTicketManagement />
    </div>
  );
};

export default AdminTicketsPage;
