
import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export const DashboardTabsNavigation = () => {
  return (
    <TabsList className="grid w-full grid-cols-4">
      <TabsTrigger value="overview">Panoramica</TabsTrigger>
      <TabsTrigger value="revenue">Revenue & Finanze</TabsTrigger>
      <TabsTrigger value="payments">Pagamenti</TabsTrigger>
      <TabsTrigger value="management">Gestione</TabsTrigger>
    </TabsList>
  );
};
