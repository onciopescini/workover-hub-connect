
import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export const DashboardTabsNavigation = () => {
  return (
    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2">
      <TabsTrigger value="overview" className="text-xs sm:text-sm">Panoramica</TabsTrigger>
      <TabsTrigger value="revenue" className="text-xs sm:text-sm">Revenue</TabsTrigger>
      <TabsTrigger value="payments" className="text-xs sm:text-sm">Pagamenti</TabsTrigger>
      <TabsTrigger value="management" className="text-xs sm:text-sm">Gestione</TabsTrigger>
    </TabsList>
  );
};
