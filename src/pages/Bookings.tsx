
import React from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { EnhancedBookingsDashboard } from '@/components/bookings/EnhancedBookingsDashboard';
import { EnterpriseHostDashboard } from '@/components/host/advanced/EnterpriseHostDashboard';

const Bookings = () => {
  const { authState } = useAuth();
  
  // Mostra la dashboard enterprise per tutti gli host (subscription logic temporaneamente rimossa)
  const isHost = authState.profile?.role === 'host';
  
  // Mock data per la demo
  const mockNotifications = [
    {
      id: '1',
      type: 'booking' as const,
      title: 'Nuova prenotazione ricevuta',
      content: 'Marco Rossi ha prenotato la Sala Conferenze A',
      timestamp: '2 minuti fa',
      priority: 'high' as const,
      isRead: false,
      metadata: {}
    },
    {
      id: '2',
      type: 'payment' as const,
      title: 'Pagamento completato',
      content: 'Ricevuto pagamento di €120 per prenotazione #1234',
      timestamp: '15 minuti fa',
      priority: 'medium' as const,
      isRead: false,
      metadata: {}
    }
  ];

  const mockRevenueData = [
    { month: 'Gen', revenue: 2400, bookings: 45, avgBookingValue: 53 },
    { month: 'Feb', revenue: 1398, bookings: 32, avgBookingValue: 44 },
    { month: 'Mar', revenue: 9800, bookings: 78, avgBookingValue: 126 },
    { month: 'Apr', revenue: 3908, bookings: 56, avgBookingValue: 70 },
    { month: 'Mag', revenue: 4800, bookings: 64, avgBookingValue: 75 },
    { month: 'Giu', revenue: 3800, bookings: 48, avgBookingValue: 79 }
  ];

  const mockPerformanceMetrics = {
    responseTime: 85,
    errorRate: 0.2,
    throughput: 750,
    availability: 99.9,
    memoryUsage: 35,
    cpuUsage: 28
  };

  if (isHost) {
    return (
      <EnterpriseHostDashboard
        bookings={[]}
        notifications={mockNotifications}
        revenueData={mockRevenueData}
        performanceMetrics={mockPerformanceMetrics}
      />
    );
  }

  return <EnhancedBookingsDashboard />;
};

export default Bookings;
