
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { AIInsightsCenter } from '@/components/dashboard/AIInsightsCenter';

export const InsightsTabContent: React.FC = () => {
  return (
    <TabsContent value="insights" className="space-y-6">
      <AIInsightsCenter />
    </TabsContent>
  );
};
