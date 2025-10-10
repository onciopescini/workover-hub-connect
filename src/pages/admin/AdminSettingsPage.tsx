import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Settings, Mail, CreditCard, Calendar, Shield, Lock, Plug } from "lucide-react";
import GeneralSettings from "@/components/admin/settings/GeneralSettings";
import EmailTemplatesManager from "@/components/admin/settings/EmailTemplatesManager";
import PaymentConfiguration from "@/components/admin/settings/PaymentConfiguration";
import BookingRulesSettings from "@/components/admin/settings/BookingRulesSettings";
import ModerationSettings from "@/components/admin/settings/ModerationSettings";
import GDPRSettings from "@/components/admin/settings/GDPRSettings";
import IntegrationSettings from "@/components/admin/settings/IntegrationSettings";

const AdminSettingsPage = () => {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Impostazioni Sistema</h1>
          <p className="text-muted-foreground mt-1">
            Configura le impostazioni globali della piattaforma
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Generali</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Pagamenti</span>
          </TabsTrigger>
          <TabsTrigger value="booking" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Prenotazioni</span>
          </TabsTrigger>
          <TabsTrigger value="moderation" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Moderazione</span>
          </TabsTrigger>
          <TabsTrigger value="gdpr" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">GDPR</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Integrazioni</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card className="p-6">
            <GeneralSettings />
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card className="p-6">
            <EmailTemplatesManager />
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card className="p-6">
            <PaymentConfiguration />
          </Card>
        </TabsContent>

        <TabsContent value="booking" className="space-y-4">
          <Card className="p-6">
            <BookingRulesSettings />
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="space-y-4">
          <Card className="p-6">
            <ModerationSettings />
          </Card>
        </TabsContent>

        <TabsContent value="gdpr" className="space-y-4">
          <Card className="p-6">
            <GDPRSettings />
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card className="p-6">
            <IntegrationSettings />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettingsPage;
