import { HostDashboardHeader } from "./HostDashboardHeader";
import { HostDashboardMetrics } from "./HostDashboardMetrics";
import { HostDashboardTabs } from "./HostDashboardTabs";
import { HostProgressTracker } from "../onboarding/HostProgressTracker";
import { QuickActions } from "../QuickActions";
import { HostDashboardContentProps } from "@/types/host/dashboard.types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { API_ENDPOINTS } from "@/constants";
import { useNavigate } from "react-router-dom";

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
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const navigate = useNavigate();

  const handleConnectStripe = async () => {
    try {
      setIsConnectingStripe(true);
      const { data, error } = await supabase.functions.invoke(API_ENDPOINTS.STRIPE_CONNECT, {
        body: { return_url: window.location.origin + '/host/dashboard?stripe_setup=success' }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No redirect URL returned');
      }
    } catch (error) {
      console.error('Stripe connect error:', error);
      toast.error("Si è verificato un errore durante la connessione a Stripe");
    } finally {
      setIsConnectingStripe(false);
    }
  };

  const pendingBookings = metrics?.pendingBookings || 0;

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
            <Button
              size="sm"
              variant="outline"
              className="bg-white border-amber-300 hover:bg-amber-100 text-amber-900"
              onClick={handleConnectStripe}
              disabled={isConnectingStripe}
            >
              {isConnectingStripe ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connessione...
                </>
              ) : (
                "Collega Stripe Ora"
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Required Alert for Pending Bookings */}
      {pendingBookings > 0 && (
        <Alert className="bg-orange-50 border-orange-200 text-orange-900">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 font-semibold">Hai {pendingBookings} prenotazioni in sospeso</AlertTitle>
          <AlertDescription className="text-orange-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <span>
              Gestisci subito le richieste per non far attendere i tuoi ospiti.
            </span>
            <Button
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white border-none"
              onClick={() => navigate('/bookings?status=pending_approval')}
            >
              Gestisci
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions Component - Includes Check-in Scanner */}
      <QuickActions />
      
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
