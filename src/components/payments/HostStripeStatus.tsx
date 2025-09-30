import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StripeStatusPill } from "@/components/host/StripeStatusPill";
import { CreditCard } from "lucide-react";
import { sreLogger } from '@/lib/sre-logger';

type Props = {
  className?: string;
};

export default function HostStripeStatus({ className = "" }: Props) {
  const { authState } = useAuth();
  const connected = !!authState.profile?.stripe_connected;
  const acct = authState.profile?.stripe_account_id;
  const status = authState.profile?.stripe_onboarding_status ?? "none";
  const [loading, setLoading] = useState(false);

  const connect = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("create-connect-onboarding-link");
      if (error) throw error;
      if (!data?.url) {
        toast.error("Link di onboarding non ricevuto");
        return;
      }
      window.location.href = data.url;
    } catch (e: any) {
      sreLogger.error('Stripe Connect onboarding link creation failed', { 
        component: 'HostStripeStatus',
        userId: authState.user?.id 
      }, e as Error);
      toast.error("Errore durante la connessione con Stripe");
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

      {/* CTA solo se non collegato */}
      {(!acct || !connected) && (
        <Button
          onClick={connect}
          disabled={loading}
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