
import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export const DashboardTabsNavigation = () => {
  return (
    <TabsList className="w-full flex flex-wrap gap-2">
      <TabsTrigger value="overview" className="flex-1 min-w-[140px] text-xs sm:text-sm">Panoramica</TabsTrigger>
      <TabsTrigger value="revenue" className="flex-1 min-w-[140px] text-xs sm:text-sm">Revenue</TabsTrigger>
      <TabsTrigger value="payments" className="flex-1 min-w-[140px] text-xs sm:text-sm">Pagamenti</TabsTrigger>
      <TabsTrigger value="management" className="flex-1 min-w-[140px] text-xs sm:text-sm">Gestione</TabsTrigger>
    </TabsList>
  );
};
