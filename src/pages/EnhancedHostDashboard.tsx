
import React, { useState } from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Euro, 
  Calendar, 
  TrendingUp, 
  Users, 
  MessageSquare,
  Building,
  BarChart3,
  AlertTriangle,
  Brain,
  CreditCard
} from "lucide-react";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AdvancedFinancialMetrics } from "@/components/dashboard/AdvancedFinancialMetrics";
import { AIInsightsCenter } from "@/components/dashboard/AIInsightsCenter";
import { ProfessionalPaymentHub } from "@/components/payments/ProfessionalPaymentHub";
import useEnhancedHostDashboard from "@/hooks/queries/useEnhancedHostDashboard";
import { useNavigate } from 'react-router-dom';

const EnhancedHostDashboard = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { metrics, recentActivity, isLoading } = useEnhancedHostDashboard();
  const [activeTab, setActiveTab] = useState('overview');

  if (!authState.isAuthenticated || authState.profile?.role !== 'host') {
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Host Professionale
          </h1>
          <p className="text-gray-600">
            Benvenuto, {authState.profile?.first_name}! Gestisci il tuo business con insights avanzati.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/host/analytics')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => navigate('/space/new')}>
            <Building className="w-4 h-4 mr-2" />
            Nuovo Spazio
          </Button>
        </div>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Fatturato Totale"
          value={metrics.totalRevenue}
          icon={<Euro className="w-5 h-5" />}
          variant="revenue"
          description="Guadagni totali confermati"
        />
        
        <MetricsCard
          title="Fatturato Mensile"
          value={metrics.monthlyRevenue}
          change={metrics.revenueGrowth}
          changeLabel="vs mese scorso"
          icon={<TrendingUp className="w-5 h-5" />}
          variant="revenue"
        />
        
        <MetricsCard
          title="Prenotazioni"
          value={`${metrics.confirmedBookings}/${metrics.totalBookings}`}
          icon={<Calendar className="w-5 h-5" />}
          variant="bookings"
          description={`${metrics.pendingBookings} in attesa`}
        />
        
        <MetricsCard
          title="Tasso Occupazione"
          value={`${metrics.occupancyRate.toFixed(1)}%`}
          icon={<Users className="w-5 h-5" />}
          variant="rate"
          description="Media mensile"
        />
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="financial">Finanze</TabsTrigger>
          <TabsTrigger value="payments">Pagamenti</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="management">Gestione</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Highlights */}
          {metrics.topPerformingSpace && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <TrendingUp className="w-5 h-5 text-yellow-500" />
                  Spazio Top Performer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-blue-900">
                      {metrics.topPerformingSpace.title}
                    </h3>
                    <p className="text-blue-700">
                      Ha generato €{metrics.topPerformingSpace.revenue.toFixed(2)} di fatturato
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/spaces/${metrics.topPerformingSpace?.id}`)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    Visualizza Spazio
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <QuickActions 
              pendingBookings={metrics.pendingBookings}
              unreadMessages={0}
            />
            <RecentActivityFeed 
              activities={recentActivity}
              onViewAll={() => navigate('/host/activity')}
            />
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <AdvancedFinancialMetrics
            totalRevenue={metrics.totalRevenue}
            monthlyRevenue={metrics.monthlyRevenue}
            revenueGrowth={metrics.revenueGrowth}
            averageBookingValue={metrics.averageBookingValue}
            occupancyRate={metrics.occupancyRate}
          />
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <ProfessionalPaymentHub />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <AIInsightsCenter />
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          {/* Management Tools */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Valore Medio Prenotazione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{metrics.averageBookingValue.toFixed(2)}
                </div>
                <p className="text-xs text-gray-600">
                  Per prenotazione confermata
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Tasso di Conferma
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.totalBookings > 0 
                    ? ((metrics.confirmedBookings / metrics.totalBookings) * 100).toFixed(1)
                    : 0}%
                </div>
                <p className="text-xs text-gray-600">
                  Prenotazioni confermate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Richieste in Attesa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.pendingBookings}
                </div>
                <p className="text-xs text-gray-600">
                  Richiedono attenzione
                </p>
                {metrics.pendingBookings > 0 && (
                  <Button 
                    size="sm" 
                    className="mt-2 w-full"
                    onClick={() => navigate('/bookings')}
                  >
                    Gestisci Ora
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedHostDashboard;
