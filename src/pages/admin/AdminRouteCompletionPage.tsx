
import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import RouteCompletion from "@/pages/RouteCompletion";

const AdminRouteCompletionPage = () => {
  return (
    <AdminLayout currentPage="/route-completion">
      <RouteCompletion />
    </AdminLayout>
  );
};

export default AdminRouteCompletionPage;
