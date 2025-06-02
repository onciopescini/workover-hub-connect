
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, CheckCircle, AlertCircle, ExternalLink, Loader2, RefreshCw, Wrench } from "lucide-react";
import { toast } from "sonner";

export function StripeSetupFixed() {
  const { authState, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    accountId: string | null;
    loading: boolean;
  }>({
    connected: false,
    accountId: null,
    loading: true
  });

  // Fetch current Stripe status from database
  const fetchStripeStatus = async () => {
    if (!authState.user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_connected, stripe_account_id')
        .eq('id', authState.user.id)
        .single();

      if (error) throw error;

      setStripeStatus({
        connected: data.stripe_connected || false,
        accountId: data.stripe_account_id,
        loading: false
      });

      console.log('🔵 Stripe status fetched from DB:', {
        connected: data.stripe_connected,
        accountId: data.stripe_account_id
      });
    } catch (error) {
      console.error('🔴 Error fetching Stripe status:', error);
      setStripeStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // Manual fix function for immediate resolution
  const runManualFix = async () => {
    setIsFixing(true);
    console.log('🔧 Running manual fix for Stripe status...');
    
    try {
      const { data, error } = await supabase.functions.invoke('fix-stripe-status');

      if (error) {
        console.error('🔴 Manual fix error:', error);
        throw error;
      }

      console.log('✅ Manual fix completed:', data);
      
      if (data.success) {
        toast.success("Stato Stripe corretto manualmente!");
        await fetchStripeStatus();
        await refreshProfile();
      } else {
        throw new Error(data.error || 'Manual fix failed');
      }
    } catch (error) {
      console.error('🔴 Error in manual fix:', error);
      toast.error('Errore nella correzione manuale');
    } finally {
      setIsFixing(false);
    }
  };

  // API status check with fallback
  const checkStripeStatusAPI = async () => {
    if (!authState.user) return;
    
    setIsCheckingStatus(true);
    console.log('🔵 Checking Stripe status via API...');

    try {
      const { data, error } = await supabase.functions.invoke('check-stripe-status');

      if (error) {
        console.error('🔴 API check failed:', error);
        toast.error('Controllo API fallito - usando correzione manuale');
        // Fallback to manual fix if API fails
        await runManualFix();
        return false;
      }

      console.log('🔵 Stripe API status response:', data);

      if (data.updated) {
        toast.success("Stato Stripe aggiornato!");
        await fetchStripeStatus();
        await refreshProfile();
      } else if (data.connected) {
        toast.success("Account Stripe verificato!");
      } else {
        toast.info("Setup Stripe non ancora completato");
      }

      return data.connected;
    } catch (error) {
      console.error('🔴 Error checking Stripe status:', error);
      toast.error('Errore nel controllo - provo correzione manuale');
      // Fallback to manual fix
      await runManualFix();
      return false;
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStripeStatus();
  }, [authState.user]);

  // Auto-check on URL parameters for Stripe setup completion
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_setup') === 'success') {
      console.log('🔵 Detected Stripe setup success from URL');
      toast.success("Setup Stripe completato! Verifico stato...");
      
      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Try API check first, then fallback to manual fix
      setTimeout(() => checkStripeStatusAPI(), 1000);
      setTimeout(() => checkStripeStatusAPI(), 3000);
      setTimeout(() => checkStripeStatusAPI(), 5000);
    }
  }, []);

  // Listen for page focus to refresh status
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔵 Page focus - checking Stripe status');
      setTimeout(checkStripeStatusAPI, 1000);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleStripeConnect = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { 
          user_id: authState.user?.id,
          return_url: window.location.origin + '/host/dashboard?stripe_setup=success',
          refresh_url: window.location.origin + '/host/dashboard?stripe_setup=refresh'
        }
      });

      if (error) throw error;

      if (data?.url) {
        console.log('🔵 Redirecting to Stripe Connect:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('URL di connessione Stripe non ricevuto');
      }
    } catch (error) {
      console.error('🔴 Error connecting to Stripe:', error);
      toast.error('Errore nella connessione con Stripe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageAccount = () => {
    if (stripeStatus.accountId) {
      window.open(`https://dashboard.stripe.com/connect/accounts/${stripeStatus.accountId}`, '_blank');
    }
  };

  if (stripeStatus.loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">Caricamento stato Stripe...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stripeStatus.connected) {
    return (
      <Card className="mb-6 border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <CardTitle className="text-lg text-green-800">Account Stripe Connesso</CardTitle>
            </div>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Attivo
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-700 mb-4">
            Il tuo account Stripe è configurato correttamente. Puoi ricevere pagamenti per le tue prenotazioni.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageAccount}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Gestisci Account
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkStripeStatusAPI}
              disabled={isCheckingStatus}
              className="text-green-700 hover:bg-green-100"
            >
              {isCheckingStatus ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Aggiorna
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <CardTitle className="text-lg text-orange-800">Configura Pagamenti</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            Richiesto
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-orange-700 mb-4">
          Connetti il tuo account Stripe per ricevere pagamenti dalle prenotazioni dei tuoi spazi.
        </p>
        
        {/* Emergency Fix Alert */}
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <Wrench className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <strong>Risoluzione Rapida:</strong> Se hai problemi con la verifica, usa il pulsante "Correggi Manualmente" per una fix immediata.
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleStripeConnect}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {isLoading ? 'Connessione...' : 'Collega Account Stripe'}
          </Button>
          
          <Button
            variant="outline"
            onClick={checkStripeStatusAPI}
            disabled={isCheckingStatus}
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            {isCheckingStatus ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Verifica Stato
          </Button>
          
          <Button
            variant="secondary"
            onClick={runManualFix}
            disabled={isFixing}
            className="bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            {isFixing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wrench className="w-4 h-4 mr-2" />
            )}
            Correggi Manualmente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
