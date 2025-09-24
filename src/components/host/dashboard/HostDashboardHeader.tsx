import React from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, Building, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/hooks/auth/useAuth";
import { StripeStatusPill } from '../StripeStatusPill';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HostDashboardHeaderProps {
  firstName?: string;
}

export const HostDashboardHeader: React.FC<HostDashboardHeaderProps> = ({
  firstName
}) => {
  const navigate = useNavigate();
  const { authState } = useAuth();

  const handleConnectStripe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-onboarding-link');
      
      if (error) {
        console.error('Stripe Connect error:', error);
        toast.error('Errore durante la connessione con Stripe');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error('Link di onboarding non ricevuto');
      }
    } catch (error) {
      console.error('Failed to create Stripe Connect link:', error);
      toast.error('Errore durante la connessione con Stripe');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Host
          </h1>
          <p className="text-gray-600">
            Benvenuto, {firstName}! Gestisci i tuoi spazi e monitora le prenotazioni.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/bookings')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Prenotazioni
          </Button>
          <Button onClick={() => navigate('/space/new')}>
            <Building className="w-4 h-4 mr-2" />
            Nuovo Spazio
          </Button>
        </div>
      </div>

      {/* Stripe Status Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <StripeStatusPill 
            isConnected={authState.profile?.stripe_connected || false}
            onboardingStatus={authState.profile?.stripe_onboarding_status || 'none'}
          />
          <span className="text-xs text-gray-500 font-mono">
            ID: {authState.profile?.stripe_account_id?.slice(-8) || '-'}
          </span>
        </div>

        {(!authState.profile?.stripe_account_id || !authState.profile?.stripe_connected) && (
          <Button 
            onClick={handleConnectStripe}
            size="sm"
            className="bg-[#635bff] hover:bg-[#5b54f0] text-white"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Collega pagamenti con Stripe
          </Button>
        )}
      </div>
    </div>
  );
};