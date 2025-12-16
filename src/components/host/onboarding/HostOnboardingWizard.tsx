import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Building2, CreditCard, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { StripeSetup } from "@/components/host/StripeSetup";
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
    experience: '',
    goals: '',
  });

  // REFACTORING (Subtraction Principle): Removed KYC, Fiscal, Location steps.
  // Simplified flow: Business Info -> Stripe Setup (Optional) -> Finish
  const steps = [
    { id: 1, title: "Benvenuto Host", icon: Building2, completed: false },
    { id: 2, title: "Setup Pagamenti", icon: CreditCard, completed: false },
    { id: 3, title: "Conclusione", icon: Users, completed: false },
  ] as const;

  const currentStep = steps[currentStepIndex]!;
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Handle return from Stripe setup
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_setup') === 'success') {
      const stripeStepIndex = steps.findIndex(s => s.id === 2);
      if (currentStepIndex < stripeStepIndex) {
        setCurrentStepIndex(stripeStepIndex);
      }
      setIsProcessingStripeReturn(true);
      handleStripeReturn();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const saveReturnUrl = async () => {
      if (currentStep.id === 2 && authState.user?.id) {
        try {
          const returnUrl = `${window.location.origin}/host/onboarding?stripe_setup=success&step=2`;
          
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

  const waitForStripeConnection = async (maxRetries = 15, intervalMs = 2000) => {
    setIsPollingStripe(true);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      setPollingAttempt(attempt);
      
      const { data, error } = await supabase.functions.invoke('check-stripe-status');
      
      if (!error && data?.connected) {
        await refreshProfile?.();
        setIsPollingStripe(false);
        setPollingAttempt(0);
        toast.success("Stripe configurato!");
        return true;
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
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
      toast.error("Completa i campi richiesti");
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

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        profession: formData.businessType,
        bio: formData.experience,
        onboarding_completed: true, // This is technically redundant if already set, but safe.
      });

      toast.success("Setup completato! Benvenuto nella dashboard.");
      onComplete?.();
      navigate("/host/dashboard");
    } catch (error) {
      sreLogger.error("Error completing onboarding", { userId: authState.user?.id }, error as Error);
      toast.error("Errore durante il salvataggio");
    } finally {
      setIsLoading(false);
    }
  };

  const isStepValid = async () => {
    switch (currentStep.id) {
      case 1:
        return !!formData.businessName; // Simple validation
      case 2:
        return true; // Optional step now
      case 3:
        return true; // Final step is just confirmation
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl font-bold">Benvenuto Host!</CardTitle>
          <CardDescription className="text-lg">
            Configura il tuo spazio in pochi passaggi
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep.id === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Parlaci del tuo Business</h3>
              
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
                <Label htmlFor="businessType">Tipo di Business (Opzionale)</Label>
                <Input
                  id="businessType"
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  placeholder="Es: Ufficio condiviso"
                />
              </div>

               <div className="space-y-2">
                <Label htmlFor="experience">Esperienza (Opzionale)</Label>
                <Textarea
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  placeholder="Raccontaci brevemente di te..."
                />
              </div>
            </div>
          )}

          {currentStep.id === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Ricevi Pagamenti (Stripe)</h3>
              <p className="text-muted-foreground">
                Collega il tuo account Stripe per ricevere i pagamenti.
                Puoi farlo ora o più tardi dalla Dashboard, ma è necessario per <strong>pubblicare</strong> gli spazi.
              </p>
              
              <StripeSetup 
                context="onboarding" 
                onComplete={() => {
                  toast.success("Stripe collegato con successo!");
                  setTimeout(() => handleNext(), 1000);
                }}
              />

              {/* Status Indicator */}
              {authState.profile?.stripe_connected ? (
                 <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-md border border-green-200">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Account collegato correttamente</span>
                 </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-md border border-amber-200">
                    <Circle className="w-5 h-5" />
                    <span>Non collegato. Puoi saltare questo passaggio e completarlo dopo.</span>
                </div>
              )}
            </div>
          )}

          {currentStep.id === 3 && (
            <div className="space-y-4 text-center">
              <h3 className="text-xl font-semibold">Tutto pronto!</h3>
              <p className="text-muted-foreground">
                 Hai completato la configurazione base. Ora puoi accedere alla tua Dashboard e iniziare a creare i tuoi spazi.
              </p>
              <div className="flex justify-center py-4">
                 <CheckCircle className="w-16 h-16 text-green-500" />
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
                    currentStep.id === 2 && !authState.profile?.stripe_connected ? "Salta per ora" : "Avanti"
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
                    "Vai alla Dashboard"
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
