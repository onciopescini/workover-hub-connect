import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GDPRRequestsManagement } from "@/components/admin/GDPRRequestsManagement";
import { DataBreachManagement } from "@/components/admin/DataBreachManagement";

const AdminGDPRPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Gestione GDPR & Privacy</h2>
        <p className="text-gray-600">Gestisci richieste GDPR e monitora violazioni dati</p>
      </div>
      
      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="requests">Richieste GDPR</TabsTrigger>
          <TabsTrigger value="breaches">Data Breach Log</TabsTrigger>
        </TabsList>
        
        <TabsContent value="requests">
          <GDPRRequestsManagement />
        </TabsContent>
        
        <TabsContent value="breaches">
          <DataBreachManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminGDPRPage;
