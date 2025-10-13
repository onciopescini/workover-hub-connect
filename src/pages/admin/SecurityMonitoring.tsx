import { SecurityAlertsPanel } from '@/components/admin/security/SecurityAlertsPanel';
import { FailedLoginChart } from '@/components/admin/security/FailedLoginChart';
import { ActiveSessionsTable } from '@/components/admin/security/ActiveSessionsTable';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SecurityMonitoring = () => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">Security Monitoring Dashboard</h1>
      
      <SecurityAlertsPanel />

      <Tabs defaultValue="charts" className="w-full">
        <TabsList>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          <FailedLoginChart />
        </TabsContent>

        <TabsContent value="sessions">
          <ActiveSessionsTable />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityMonitoring;
