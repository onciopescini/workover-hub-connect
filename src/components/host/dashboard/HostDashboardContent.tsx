import { HostDashboardHeader } from "./HostDashboardHeader";
import { HostDashboardMetrics } from "./HostDashboardMetrics";
import { HostDashboardTabs } from "./HostDashboardTabs";
import { HostProgressTracker } from "../onboarding/HostProgressTracker";
import { HostDashboardContentProps } from "@/types/host/dashboard.types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/auth/useAuth";

export const HostDashboardContent = ({
  firstName,
  metrics,
  recentActivity,
  activeTab,
  setActiveTab,
  shouldShowProgressTracker
}: HostDashboardContentProps) => {
  const { authState } = useAuth();
  const stripeConnected = authState.profile?.stripe_connected;

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <HostDashboardHeader firstName={firstName ?? ''} />

      {/* Warning Banner for Missing Stripe Connection */}
      {!stripeConnected && (
        <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 font-semibold">Configurazione Pagamenti Incompleta</AlertTitle>
          <AlertDescription className="text-amber-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <span>
              Non puoi <strong>pubblicare</strong> nuovi spazi finché non colleghi il tuo account Stripe.
              Puoi comunque creare bozze.
            </span>
            <Button size="sm" variant="outline" className="bg-white border-amber-300 hover:bg-amber-100 text-amber-900" asChild>
              <Link to="/host/onboarding?step=2">Collega Stripe Ora</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Explicit "Create Space" Action if not present in Header */}
      <div className="flex justify-end">
         <Button asChild className="gap-2">
            <Link to="/host/space/new">
               <Plus className="h-4 w-4" />
               Crea Nuovo Spazio
            </Link>
         </Button>
      </div>
      
      {metrics && <HostDashboardMetrics metrics={metrics} />}
      
      {/* 2-column layout for desktop */}
      <div className={`grid grid-cols-1 gap-6 ${shouldShowProgressTracker ? 'lg:grid-cols-[1fr_380px]' : ''}`}>
        {/* Left column - Main content */}
        <div className="space-y-6">
          <HostDashboardTabs 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            metrics={metrics ?? {
              totalRevenue: 0,
              monthlyRevenue: 0,
              totalBookings: 0,
              pendingBookings: 0,
              confirmedBookings: 0,
              occupancyRate: 0,
              averageBookingValue: 0,
              revenueGrowth: 0,
              topPerformingSpace: null
            }}
            recentActivity={recentActivity ?? []}
          />
        </div>
        
        {/* Right column - Sidebar - Collapsible on mobile */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          {shouldShowProgressTracker && (
            <div className="hidden md:block">
              <HostProgressTracker />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
