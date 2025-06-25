
import React from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { EnhancedBookingsDashboard } from '@/components/bookings/EnhancedBookingsDashboard';
import { AppLayout } from "@/components/layout/AppLayout";

export default function Bookings() {
  const { authState } = useAuth();

  console.log('🔍 Bookings page: Current auth state:', {
    userId: authState.user?.id,
    userRole: authState.profile?.role,
    isAuthenticated: authState.isAuthenticated
  });

  if (!authState.isAuthenticated) {
    return (
      <AppLayout title="Access Required" subtitle="Please log in to view your bookings">
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
              <p className="text-gray-600 mb-4">Please log in to view your bookings.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Bookings" subtitle="Manage and track all your bookings">
      <EnhancedBookingsDashboard />
    </AppLayout>
  );
}
