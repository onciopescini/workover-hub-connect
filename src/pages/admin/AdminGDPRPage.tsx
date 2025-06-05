
import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GDPRRequestsManagement } from "@/components/admin/GDPRRequestsManagement";
import { DAC7ReportsManagement } from "@/components/admin/DAC7ReportsManagement";
import { DataRetentionManagement } from "@/components/admin/DataRetentionManagement";

const AdminGDPRPage = () => {
  return (
    <AdminLayout currentPage="/admin/gdpr">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            GDPR & Compliance
          </h2>
          <p className="text-gray-600">
            Gestisci privacy, fiscalità e conformità normativa
          </p>
        </div>

        <Tabs defaultValue="gdpr" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gdpr">Richieste GDPR</TabsTrigger>
            <TabsTrigger value="dac7">Report DAC7</TabsTrigger>
            <TabsTrigger value="retention">Data Retention</TabsTrigger>
          </TabsList>

          <TabsContent value="gdpr" className="space-y-6">
            <GDPRRequestsManagement />
          </TabsContent>

          <TabsContent value="dac7" className="space-y-6">
            <DAC7ReportsManagement />
          </TabsContent>

          <TabsContent value="retention" className="space-y-6">
            <DataRetentionManagement />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminGDPRPage;
