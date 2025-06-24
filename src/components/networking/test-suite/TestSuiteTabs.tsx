
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Activity, Zap, Shield, Palette, BookOpen } from "lucide-react";
import { NetworkingMonitoring } from "@/components/networking/NetworkingMonitoring";
import { NetworkingHealthCheck } from "@/components/networking/NetworkingHealthCheck";
import { NetworkingPerformanceTest } from "@/components/networking/NetworkingPerformanceTest";
import { NetworkingSecurityValidator } from "@/components/networking/NetworkingSecurityValidator";
import { NetworkingUXOptimizer } from "@/components/networking/NetworkingUXOptimizer";
import { NetworkingDocumentation } from "@/components/networking/NetworkingDocumentation";

export const TestSuiteTabs: React.FC = () => {
  return (
    <Tabs defaultValue="monitoring" className="space-y-6">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="monitoring" className="flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          Monitoring
        </TabsTrigger>
        <TabsTrigger value="health" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Health Check
        </TabsTrigger>
        <TabsTrigger value="performance" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Performance
        </TabsTrigger>
        <TabsTrigger value="security" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Sicurezza
        </TabsTrigger>
        <TabsTrigger value="ux" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          UX/UI
        </TabsTrigger>
        <TabsTrigger value="docs" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Docs
        </TabsTrigger>
      </TabsList>

      <TabsContent value="monitoring">
        <NetworkingMonitoring />
      </TabsContent>

      <TabsContent value="health">
        <NetworkingHealthCheck />
      </TabsContent>

      <TabsContent value="performance">
        <NetworkingPerformanceTest />
      </TabsContent>

      <TabsContent value="security">
        <NetworkingSecurityValidator />
      </TabsContent>

      <TabsContent value="ux">
        <NetworkingUXOptimizer />
      </TabsContent>

      <TabsContent value="docs">
        <NetworkingDocumentation />
      </TabsContent>
    </Tabs>
  );
};
