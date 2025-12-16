import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StripeStatusPill } from "@/components/host/StripeStatusPill";
import { CreditCard, RefreshCw } from "lucide-react";
import { sreLogger } from '@/lib/sre-logger';
import { useStripeStatus } from "@/hooks/useStripeStatus";

type Props = {
  className?: string;
};

export default function HostStripeStatus({ className = "" }: Props) {
  const { authState } = useAuth();
  const { isVerifying, manualRefresh } = useStripeStatus();
  const [loading, setLoading] = useState(false);
  
  // Sync with authState.profile changes
  const [connected, setConnected] = useState(!!authState.profile?.stripe_connected);
  const [acct, setAcct] = useState(authState.profile?.stripe_account_id);
  const [status, setStatus] = useState(authState.profile?.stripe_onboarding_status ?? "none");

  // Update local state when authState.profile changes
  useEffect(() => {
    setConnected(!!authState.profile?.stripe_connected);
    setAcct(authState.profile?.stripe_account_id);
    setStatus(authState.profile?.stripe_onboarding_status ?? "none");
  }, [authState.profile?.stripe_connected, authState.profile?.stripe_account_id, authState.profile?.stripe_onboarding_status]);

  const connect = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
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
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Pill di stato */}
      <StripeStatusPill 
        isConnected={connected}
        onboardingStatus={status}
      />

      {/* Mostra ID breve se presente */}
      {acct && <span className="text-xs text-gray-500 font-mono">ID: …{acct.slice(-8)}</span>}

      {/* Show manual refresh if connected */}
      {connected && acct && (
        <Button
          onClick={manualRefresh}
          disabled={isVerifying}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isVerifying ? 'animate-spin' : ''}`} />
          {isVerifying ? "Verifica..." : "Verifica status"}
        </Button>
      )}

      {/* CTA solo se non collegato */}
      {!connected && (
        <Button
          onClick={connect}
          disabled={loading || isVerifying}
          size="sm"
          className="bg-[#635bff] hover:bg-[#5b54f0] text-white"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {loading ? "Reindirizzamento…" : "Collega pagamenti con Stripe"}
        </Button>
      )}
    </div>
  );
}
