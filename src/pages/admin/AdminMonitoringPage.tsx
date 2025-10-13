/**
 * Admin Monitoring Page
 * 
 * Centralized monitoring dashboard for admins showing system alerts,
 * performance metrics, and health status.
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SystemAlertsPanel } from '@/components/admin/monitoring/SystemAlertsPanel';
import { PerformanceDashboard } from '@/components/admin/monitoring/PerformanceDashboard';
import { NetworkingMonitoring } from '@/components/networking/NetworkingMonitoring';
import { NetworkingHealthCheck } from '@/components/networking/NetworkingHealthCheck';

export default function AdminMonitoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System Monitoring</h2>
        <p className="text-muted-foreground">
          Monitor system health, performance metrics, and alerts
        </p>
      </div>

      <Tabs defaultValue="alerts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="health">Health Check</TabsTrigger>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-6">
          <SystemAlertsPanel maxHeight="600px" />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceDashboard />
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <NetworkingHealthCheck />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <NetworkingMonitoring />
        </TabsContent>
      </Tabs>
    </div>
  );
}
