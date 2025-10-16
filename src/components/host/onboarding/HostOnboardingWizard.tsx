import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Building2, CreditCard, MapPin, Users, Loader2, FileText, Shield } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { StripeSetup } from "@/components/host/StripeSetup";
import { FiscalRegimeStep } from "./FiscalRegimeStep";
import { KycDocumentsStep } from "./KycDocumentsStep";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

interface HostOnboardingWizardProps {
  onComplete?: () => void;
}

export const HostOnboardingWizard: React.FC<HostOnboardingWizardProps> = ({ onComplete }) => {
  const { authState, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // Index starts at 0
  const [isProcessingStripeReturn, setIsProcessingStripeReturn] = useState(false);
  const [isPollingStripe, setIsPollingStripe] = useState(false);
  const [pollingAttempt, setPollingAttempt] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    businessAddress: '',
    experience: '',
    goals: '',
    spacesCount: '1',
  });

  const steps = [
    { id: 1, title: "Informazioni Business", icon: Building2, completed: false },
    { id: 2, title: "Setup Pagamenti", icon: CreditCard, completed: false },
    { id: 2.5, title: "Verifica Identità", icon: Shield, completed: false },
    { id: 3, title: "Dati Fiscali", icon: FileText, completed: false },
    { id: 4, title: "Localizzazione", icon: MapPin, completed: false },
    { id: 5, title: "Obiettivi Host", icon: Users, completed: false },
  ] as const;

  const currentStep = steps[currentStepIndex]!; // Derived from index, guaranteed to exist
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Handle return from Stripe setup
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_setup') === 'success') {
      // Assicurati che siamo al step Stripe
      const stripeStepIndex = steps.findIndex(s => s.id === 2);
      if (currentStepIndex < stripeStepIndex) {
        setCurrentStepIndex(stripeStepIndex);
      }
      setIsProcessingStripeReturn(true);
      handleStripeReturn();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []); // Esegui solo una volta al mount

  // Salva l'URL di ritorno nel profilo quando siamo allo step 2
  useEffect(() => {
    const saveReturnUrl = async () => {
      if (currentStep.id === 2 && authState.user?.id) {
        try {
          const returnUrl = `${window.location.origin}/host/onboarding?stripe_setup=success&step=3`;
          
          // Salva l'URL nel profilo
          const { error } = await supabase
            .from('profiles')
            .update({ return_url: returnUrl })
            .eq('id', authState.user.id);
            
          if (error) {
            sreLogger.error("Errore nel salvare l'URL di ritorno", { userId: authState.user.id }, error as Error);
          }
        } catch (error) {
          sreLogger.error("Errore nel salvare l'URL di ritorno", { userId: authState.user.id }, error as Error);
        }
      }
    };
    
    saveReturnUrl();
  }, [currentStep.id, authState.user?.id]);

  // FASE 4: Polling automatico Stripe connection (15 retry × 2s)
  // ✅ FIX: Chiamata diretta a check-stripe-status invece di cache refreshProfile
  const waitForStripeConnection = async (maxRetries = 15, intervalMs = 2000) => {
    setIsPollingStripe(true);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      setPollingAttempt(attempt);
      
      // ✅ CHIAMATA DIRETTA A STRIPE API (no cache)
      const { data, error } = await supabase.functions.invoke('check-stripe-status');
      
      if (!error && data?.connected) {
        // ✅ Aggiorna profilo locale DOPO conferma Stripe
        await refreshProfile?.();
        setIsPollingStripe(false);
        setPollingAttempt(0);
        toast.success("Stripe configurato! Procedendo alla verifica identità...");
        const kycStepIndex = steps.findIndex(s => s.id === 2.5);
        setCurrentStepIndex(kycStepIndex);
        return true;
      }
      
      // Wait before next attempt (except on last)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
    // Timeout reached
    setIsPollingStripe(false);
    setPollingAttempt(0);
    return false;
  };

  const handleStripeReturn = async () => {
    setIsProcessingStripeReturn(true);
    const success = await waitForStripeConnection();
    
    if (!success) {
      toast.warning(
        "Verifica Stripe in ritardo. Usa il pulsante 'Ricontrolla' o attendi.",
        { duration: 5000 }
      );
    }
    setIsProcessingStripeReturn(false);
  };

  const handleNext = async () => {
    const valid = await isStepValid();
    if (!valid) {
      toast.error("Completa tutti i campi richiesti prima di procedere");
      return;
    }
    
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // FASE 2: Pre-submit validation robusta
  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // ===== PRE-SUBMIT VALIDATION =====
      
      // 1. Check Stripe connected
      if (!authState.profile?.stripe_connected) {
        toast.error("Stripe non connesso. Completa lo step pagamenti.");
        const stripeStepIndex = steps.findIndex(s => s.id === 2);
        setCurrentStepIndex(stripeStepIndex);
        return;
      }
      
      // 2. Check Fiscal data in profiles (sufficient for onboarding)
      if (!authState.profile?.fiscal_regime || !authState.profile?.iban) {
        toast.error("Dati fiscali mancanti. Completa lo step dati fiscali.");
        const fiscalStepIndex = steps.findIndex(s => s.id === 3);
        setCurrentStepIndex(fiscalStepIndex);
        return;
      }
      
      // ===== ALL CHECKS OK: PROCEED =====
      await updateProfile({
        profession: formData.businessType,
        bio: formData.experience,
        location: formData.businessAddress,
        onboarding_completed: true,
      });

      toast.success("Onboarding completato! Benvenuto nella community host!");
      onComplete?.();
      navigate("/host/dashboard");
    } catch (error) {
      sreLogger.error("Error completing onboarding", { userId: authState.user?.id }, error as Error);
      toast.error("Errore durante il completamento dell'onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  // FASE 2: Step validation with double check for step 3
  const isStepValid = async () => {
    switch (currentStep.id) {
      case 1:
        return formData.businessName && formData.businessType;
      case 2:
        return authState.profile?.stripe_connected || isProcessingStripeReturn;
      case 2.5:
        return true; // Allow to continue even if KYC not yet verified (admin will verify)
      case 3:
        // Valida solo che i dati essenziali siano salvati in profiles
        // tax_details può essere incompleto in fase di onboarding
        return !!(
          authState.profile?.fiscal_regime && 
          authState.profile?.iban
        );
      case 4:
        return formData.businessAddress;
      case 5:
        return formData.experience && formData.goals;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl font-bold">Configurazione Host</CardTitle>
          <CardDescription className="text-lg">
            Configura il tuo profilo host in pochi semplici step
          </CardDescription>
          
          <div className="mt-6">
            <Progress value={progress} className="w-full mb-4" />
            <div className="flex justify-center space-x-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center space-y-2">
                  <div className={`rounded-full p-3 ${
                    index <= currentStepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{step.title}</p>
                    {index < currentStepIndex && (
                      <CheckCircle className="w-4 h-4 text-green-600 mx-auto mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep.id === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Informazioni del tuo Business</h3>
              
              <div className="space-y-2">
                <Label htmlFor="businessName">Nome Business/Spazio</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="Es: CoWorking Milano Centro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType">Tipo di Business</Label>
                <Input
                  id="businessType"
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  placeholder="Es: Coworking, Ufficio condiviso, Sala meeting"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="spacesCount">Quanti spazi intendi pubblicare?</Label>
                <Input
                  id="spacesCount"
                  type="number"
                  value={formData.spacesCount}
                  onChange={(e) => setFormData({ ...formData, spacesCount: e.target.value })}
                  min="1"
                />
              </div>
            </div>
          )}

          {currentStep.id === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Setup Pagamenti</h3>
              <p className="text-muted-foreground">
                Per ricevere pagamenti dai coworker, devi configurare il tuo account Stripe.
                Questo passaggio è obbligatorio per diventare host.
              </p>
              
              <StripeSetup 
                context="onboarding" 
                onComplete={() => {
                  toast.success("Setup Stripe completato!");
                  const kycStepIndex = steps.findIndex(s => s.id === 2.5);
                  setTimeout(() => setCurrentStepIndex(kycStepIndex), 1000);
                }}
              />
              
              {/* FASE 4: UI Feedback polling Stripe */}
              {isPollingStripe && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      Verificando connessione Stripe...
                    </p>
                    <p className="text-sm text-blue-700">
                      Tentativo {pollingAttempt} di 15
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Il webhook Stripe può richiedere fino a 30 secondi
                    </p>
                  </div>
                </div>
              )}

              {!isPollingStripe && !authState.profile?.stripe_connected && (
                <>
                  <Button 
                    onClick={handleStripeReturn} 
                    variant="outline"
                    className="w-full"
                    disabled={isProcessingStripeReturn}
                  >
                    🔄 Ricontrolla Connessione Stripe
                  </Button>
                  
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <p className="text-amber-800 font-medium">
                      ⚠️ Devi completare la configurazione Stripe per procedere
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {currentStep.id === 2.5 && (
            <KycDocumentsStep
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep.id === 3 && (
            <FiscalRegimeStep 
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep.id === 4 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Localizzazione</h3>
              
              <div className="space-y-2">
                <Label htmlFor="businessAddress">Indirizzo principale del business</Label>
                <Textarea
                  id="businessAddress"
                  value={formData.businessAddress}
                  onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                  placeholder="Via Roma 123, 20121 Milano MI, Italia"
                  rows={3}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-blue-800 text-sm">
                  💡 <strong>Tip:</strong> Un indirizzo preciso aiuta i coworker a trovarti facilmente 
                  e migliora la visibilità nei risultati di ricerca.
                </p>
              </div>
            </div>
          )}

          {currentStep.id === 5 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">I tuoi Obiettivi come Host</h3>
              
              <div className="space-y-2">
                <Label htmlFor="experience">Parlaci della tua esperienza</Label>
                <Textarea
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  placeholder="Es: Gestisco uno spazio coworking da 3 anni e amo creare community..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">Quali sono i tuoi obiettivi?</Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                  placeholder="Es: Voglio ottimizzare l'occupazione dei miei spazi e creare una community di professionisti..."
                  rows={3}
                />
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Quasi fatto!</span>
                </div>
                <p className="text-green-700 mt-1">
                  Stai per entrare nella community Workover come host ufficiale!
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6">
            {currentStepIndex > 0 && (
              <Button variant="outline" onClick={handleBack}>
                Indietro
              </Button>
            )}
            
            <div className="ml-auto">
              {currentStepIndex < steps.length - 1 ? (
                <Button 
                  onClick={handleNext} 
                  disabled={isProcessingStripeReturn || isPollingStripe}
                >
                  {isProcessingStripeReturn || isPollingStripe ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Elaborazione...
                    </>
                  ) : (
                    "Avanti"
                  )}
                </Button>
              ) : (
                <Button onClick={handleComplete} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Completa Setup"
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};