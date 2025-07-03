
import React, { useState } from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { EnhancedHostDashboardHeader } from "@/components/host/dashboard/EnhancedHostDashboardHeader";
import { EnhancedHostDashboardMetrics } from "@/components/host/dashboard/EnhancedHostDashboardMetrics";
import { EnhancedHostDashboardTabs } from "@/components/host/dashboard/EnhancedHostDashboardTabs";
import { HostProgressTracker } from "@/components/host/onboarding/HostProgressTracker";
import useEnhancedHostDashboard from "@/hooks/queries/useEnhancedHostDashboard";

const EnhancedHostDashboard = () => {
  const { authState } = useAuth();
  const { metrics, recentActivity, isLoading } = useEnhancedHostDashboard();
  const [activeTab, setActiveTab] = useState('overview');

  console.log('🔍 Host Dashboard: Current auth state:', {
    userId: authState.user?.id,
    userRole: authState.profile?.role,
    isAuthenticated: authState.isAuthenticated,
    hasMetrics: !!metrics
  });

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Accesso Richiesto</h2>
            <p className="text-gray-600">
              Effettua il login per accedere alla dashboard host.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authState.profile?.role !== 'host' && authState.profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Accesso Limitato</h2>
            <p className="text-gray-600">
              Solo gli host possono accedere a questa dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !metrics) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <EnhancedHostDashboardHeader firstName={authState.profile?.first_name} />
      <EnhancedHostDashboardMetrics metrics={metrics} />
      
      {/* Show progress tracker if user hasn't completed setup */}
      {(!authState.profile?.stripe_connected || !authState.profile?.onboarding_completed) && (
        <HostProgressTracker />
      )}
      
      <EnhancedHostDashboardTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metrics={metrics}
        recentActivity={recentActivity}
      />
    </div>
  );
};

export default EnhancedHostDashboard;
