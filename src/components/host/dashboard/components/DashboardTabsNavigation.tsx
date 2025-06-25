
import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export const DashboardTabsNavigation: React.FC = () => {
  return (
    <TabsList className="grid w-full grid-cols-5">
      <TabsTrigger value="overview">Panoramica</TabsTrigger>
      <TabsTrigger value="financial">Finanze</TabsTrigger>
      <TabsTrigger value="payments">Pagamenti</TabsTrigger>
      <TabsTrigger value="insights">AI Insights</TabsTrigger>
      <TabsTrigger value="management">Gestione</TabsTrigger>
    </TabsList>
  );
};
