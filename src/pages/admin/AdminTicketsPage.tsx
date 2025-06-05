
import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminTicketManagement } from "@/components/admin/AdminTicketManagement";

const AdminTicketsPage = () => {
  return (
    <AdminLayout currentPage="/admin/tickets">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestione Ticket</h2>
      <AdminTicketManagement />
    </AdminLayout>
  );
};

export default AdminTicketsPage;
