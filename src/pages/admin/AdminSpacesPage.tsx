
import React, { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminSpaceManagement } from "@/components/admin/AdminSpaceManagement";
import { SpaceReportsPanel } from "@/components/admin/spaces/SpaceReportsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminSpacesPage = () => {
  return (
    <AdminLayout currentPage="/admin/spaces">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestione Spazi</h2>
          <p className="text-gray-600">Modera spazi, gestisci approvazioni e segnalazioni</p>
        </div>

        <Tabs defaultValue="moderation" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="moderation">Moderazione</TabsTrigger>
            <TabsTrigger value="reports">Segnalazioni</TabsTrigger>
          </TabsList>
          
          <TabsContent value="moderation" className="space-y-6">
            <AdminSpaceManagement />
          </TabsContent>
          
          <TabsContent value="reports" className="space-y-6">
            <SpaceReportsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSpacesPage;
