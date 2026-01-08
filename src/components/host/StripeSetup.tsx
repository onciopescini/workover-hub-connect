import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertTriangle, CheckCircle, ExternalLink, Loader2, Info } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";
import { useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constants";

interface StripeSetupProps {
  context?: 'onboarding' | 'dashboard';
  onComplete?: () => void;
}

export function StripeSetup({ context = 'dashboard', onComplete }: StripeSetupProps = {}) {
  const { authState, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Initialize logger for this component
  const logger = useLogger({
    context: 'StripeSetup',
    enablePerformanceTracking: true,
    metadata: {
      componentType: 'stripe-setup',
      userId: authState.user?.id
    }
  });
  
  // Leggi lo stato direttamente dal profilo autenticato con fallback sicuri
  const stripeConnected = authState.profile?.stripe_connected || false;
  const stripeAccountId = authState.profile?.stripe_account_id || null;

  logger.debug("StripeSetup component state", {
    action: 'state_check',
    userId: authState.user?.id,
    stripeConnected,
    stripeAccountId,
    profileLoaded: !!authState.profile
  });

  // Auto-refresh status quando la pagina viene ricaricata o focus
  useEffect(() => {
    const handleFocus = () => {
      if (authState.user && !stripeConnected) {
        logger.info("Page focus detected - checking Stripe status", {
          action: 'page_focus',
          userId: authState.user?.id
        });
        handleRefreshStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [authState.user, stripeConnected]);

  // Check URL parameters per redirect da Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_setup') === 'success') {
      logger.info("Detected Stripe setup success from URL", {
        action: 'stripe_redirect_success',
        urlParams: Object.fromEntries(urlParams.entries())
      });
      toast.success("Setup Stripe completato! Controllo stato...");
      handleRefreshStatus();
      // Pulisci l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleStripeConnect = async () => {
    setIsLoading(true);
    setLastError(null);
    
    const timer = logger.startTimer('stripe_connect_process');
    
    try {
      logger.info("Starting Stripe connection process", {
        action: 'stripe_connect_start',
        userId: authState.user?.id
      });
      
      // Fallback URLs in caso non ci sia un URL personalizzato nel profilo
      const defaultReturnUrl = context === 'onboarding' 
        ? `${window.location.origin}/host/onboarding?stripe_setup=success`
        : `${window.location.origin}/host/dashboard?stripe_setup=success`;
      
      const defaultRefreshUrl = context === 'onboarding'
        ? `${window.location.origin}/host/onboarding?stripe_setup=refresh`
        : `${window.location.origin}/host/dashboard?stripe_setup=refresh`;
        
      // I return_url e refresh_url personalizzati sono già nel profilo e verranno
      // recuperati dal server nel edge function

      const { data, error } = await supabase.functions.invoke(API_ENDPOINTS.STRIPE_CONNECT, {
        body: {
          return_url: defaultReturnUrl,
          refresh_url: defaultRefreshUrl
        }
      });

      if (error) {
        logger.error("Stripe Connect API error", error, {
          action: 'stripe_connect_error',
          errorType: 'api_error'
        });
        setLastError(error.message);
        throw error;
      }

      if (data?.success && data?.url) {
        logger.info("Stripe Connect URL received successfully", {
          action: 'stripe_connect_url_received',
          hasUrl: !!data.url,
          urlLength: data.url?.length
        });
        // Apri Stripe Connect in una nuova finestra
        window.open(data.url, '_blank');
        toast.success("Reindirizzamento a Stripe Connect...");
      } else {
        const errorMsg = data?.error || "URL di reindirizzamento non ricevuto";
        logger.warn("Stripe Connect response invalid", {
          action: 'stripe_connect_invalid_response',
          hasSuccess: !!data?.success,
          hasUrl: !!data?.url,
          hasError: !!data?.error,
          errorMsg
        });
        setLastError(errorMsg);
        throw new Error(errorMsg);
      }
      
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error("Stripe connection process failed", errorObj, {
        action: 'stripe_connect_failed',
        errorMessage: errorObj.message
      });
      const errorMessage = error instanceof Error ? error.message : "Errore nel collegamento con Stripe";
      setLastError(errorMessage);
      toast.error(errorMessage);
    } finally {
      timer.end();
      setIsLoading(false);
    }
  };

  const handleStripeManage = () => {
    logger.info("User redirected to Stripe dashboard", {
      action: 'stripe_dashboard_redirect',
      stripeAccountId
    });
    // Reindirizza al dashboard Stripe
    window.open(API_ENDPOINTS.STRIPE_DASHBOARD, "_blank");
  };

  const handleRefreshStatus = async () => {
    setIsCheckingStatus(true);
    setLastError(null);
    
    const timer = logger.startTimer('refresh_stripe_status');
    
    try {
      logger.info("Starting profile status refresh", {
        action: 'refresh_status_start',
        userId: authState.user?.id
      });
      
      // Forza refresh del profilo dal server
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          logger.error("Profile fetch error during status refresh", error, {
            action: 'refresh_status_profile_error',
            userId: user.id
          });
          setLastError("Errore nel caricamento del profilo");
          throw error;
        }

        logger.info("Profile updated successfully", {
          action: 'refresh_status_success',
          stripeConnected: profile?.stripe_connected,
          stripeAccountId: profile?.stripe_account_id,
          profileId: profile?.id
        });

        if (profile?.stripe_connected && !stripeConnected) {
          logger.info("Stripe status changed to connected", {
            action: 'stripe_status_changed',
            previousStatus: stripeConnected,
            newStatus: profile.stripe_connected
          });
          
          // Invalidate host progress cache to trigger immediate refresh
          await queryClient.invalidateQueries({ queryKey: ['host-progress'] });
          
          // Refresh AuthContext to update UI immediately
          await refreshProfile?.();
          
          toast.success("Setup Stripe completato! Progresso aggiornato.");
          
          // Call onComplete callback if provided (for onboarding context)
          onComplete?.();
          
        } else if (!profile?.stripe_connected) {
          logger.info("Stripe setup still in progress", {
            action: 'stripe_setup_pending',
            stripeConnected: profile?.stripe_connected
          });
          toast.info("Setup Stripe ancora in corso...");
        }
      }
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error("Status refresh process failed", errorObj, {
        action: 'refresh_status_failed',
        errorMessage: errorObj.message
      });
      const errorMessage = error instanceof Error ? error.message : "Errore nel controllo dello stato";
      setLastError(errorMessage);
      toast.error(errorMessage);
    } finally {
      timer.end();
      setIsCheckingStatus(false);
    }
  };

  // Show loading if profile is not yet loaded
  if (authState.isLoading || !authState.profile) {
    logger.debug("Component in loading state", {
      action: 'component_loading',
      authLoading: authState.isLoading,
      hasProfile: !!authState.profile
    });
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Configurazione Pagamenti
            <Loader2 className="h-4 w-4 animate-spin" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Caricamento stato Stripe...</p>
        </CardContent>
      </Card>
    );
  }

  // Log component render
  logger.trackRender('StripeSetup');

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Configurazione Pagamenti
          {stripeConnected ? (
            <Badge variant="default" className="bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Configurato
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Richiesto
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lastError && (
          <Alert className="mb-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Errore:</strong> {lastError}
            </AlertDescription>
          </Alert>
        )}

        {isCheckingStatus && (
          <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-600" />
            <span className="text-blue-800 font-medium">Stripe configurato, aggiornamento in corso...</span>
          </div>
        )}

        {!stripeConnected ? (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Setup richiesto:</strong> Prima di poter pubblicare spazi e ricevere pagamenti, 
                devi configurare il tuo account Stripe per gestire i pagamenti.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <h4 className="font-medium">Cosa include la configurazione Stripe:</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4" role="list">
                <li>• Verifica della tua identità</li>
                <li>• Configurazione dei metodi di pagamento</li>
                <li>• Setup dei conti bancari per i pagamenti</li>
                <li>• Configurazione delle commissioni</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleStripeConnect}
                disabled={isLoading || isCheckingStatus}
                className="flex-1"
                aria-label="Configura il tuo account Stripe"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Caricamento...
                  </>
                ) : (
                  "Configura Account Stripe"
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleRefreshStatus}
                disabled={isLoading || isCheckingStatus}
                aria-label="Controlla stato della configurazione"
              >
                {isCheckingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Ricontrolla"
                )}
              </Button>
            </div>

            {lastError && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Se il problema persiste, verifica che la tua chiave Stripe sia configurata correttamente 
                  nelle impostazioni del progetto.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Account Stripe configurato correttamente</span>
            </div>
            
            <p className="text-sm text-gray-600">
              Il tuo account Stripe è collegato e configurato. Puoi ora pubblicare spazi 
              e ricevere pagamenti dai coworker.
            </p>

            {stripeAccountId && (
              <p className="text-xs text-gray-500">
                Account ID: {stripeAccountId}
              </p>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleStripeManage}
                className="flex items-center gap-2"
                aria-label="Gestisci il tuo account Stripe"
              >
                <ExternalLink className="h-4 w-4" />
                Gestisci Account Stripe
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={handleRefreshStatus}
                disabled={isCheckingStatus}
                size="sm"
                aria-label="Aggiorna stato Stripe"
              >
                {isCheckingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Aggiorna"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
