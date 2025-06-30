
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdvancedHostNotifications } from './AdvancedHostNotifications';
import { BulkBookingManagement } from './BulkBookingManagement';
import { AutoApprovalRulesEngine } from './AutoApprovalRulesEngine';
import { AdvancedRevenueAnalytics } from './AdvancedRevenueAnalytics';
import { PerformanceMonitoring } from './PerformanceMonitoring';
import { BookingWithDetails } from '@/types/booking';

interface EnterpriseHostDashboardProps {
  bookings: BookingWithDetails[];
  notifications: any[];
  revenueData: any[];
  performanceMetrics: any;
}

export const EnterpriseHostDashboard: React.FC<EnterpriseHostDashboardProps> = ({
  bookings,
  notifications,
  revenueData,
  performanceMetrics
}) => {
  const [autoApprovalRules, setAutoApprovalRules] = useState([]);

  const handleNotificationRead = (id: string) => {
    console.log('Marking notification as read:', id);
  };

  const handleBulkBookingAction = (action: string, bookingIds: string[]) => {
    console.log('Bulk action:', action, 'for bookings:', bookingIds);
  };

  const mockAlerts = [
    {
      severity: 'warning',
      title: 'Tempo risposta elevato',
      message: 'Il tempo di risposta medio è aumentato del 15%',
      timestamp: '2 minuti fa'
    },
    {
      severity: 'info',
      title: 'Picco di traffico',
      message: 'Registrato aumento del 40% nelle richieste',
      timestamp: '5 minuti fa'
    }
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard Enterprise Host</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Versione Enterprise</span>
          <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full">
            PRO
          </span>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="bookings">Gestione Avanzata</TabsTrigger>
          <TabsTrigger value="automation">Automazione</TabsTrigger>
          <TabsTrigger value="analytics">Analytics Pro</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="notifications">Notifiche</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdvancedRevenueAnalytics
              revenueData={revenueData}
              totalRevenue={25420}
              monthlyGrowth={18}
              bookingTrends={[]}
              forecasts={[]}
            />
            <PerformanceMonitoring
              metrics={performanceMetrics}
              historicalData={[]}
              alerts={mockAlerts}
            />
          </div>
        </TabsContent>

        <TabsContent value="bookings">
          <BulkBookingManagement
            bookings={bookings}
            onBulkAction={handleBulkBookingAction}
          />
        </TabsContent>

        <TabsContent value="automation">
          <AutoApprovalRulesEngine
            rules={autoApprovalRules}
            onUpdateRules={setAutoApprovalRules}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <AdvancedRevenueAnalytics
            revenueData={revenueData}
            totalRevenue={25420}
            monthlyGrowth={18}
            bookingTrends={[]}
            forecasts={[]}
          />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceMonitoring
            metrics={performanceMetrics}
            historicalData={[]}
            alerts={mockAlerts}
          />
        </TabsContent>

        <TabsContent value="notifications">
          <AdvancedHostNotifications
            notifications={notifications}
            onMarkAsRead={handleNotificationRead}
            onMarkAllAsRead={() => console.log('Mark all as read')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
