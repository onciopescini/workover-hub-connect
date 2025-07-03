import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Building2, CreditCard, MapPin, Users } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { StripeSetup } from "@/components/host/StripeSetup";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface HostOnboardingWizardProps {
  onComplete?: () => void;
}

export const HostOnboardingWizard: React.FC<HostOnboardingWizardProps> = ({ onComplete }) => {
  const { authState, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
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
    { id: 3, title: "Localizzazione", icon: MapPin, completed: false },
    { id: 4, title: "Obiettivi Host", icon: Users, completed: false },
  ];

  const progress = (currentStep / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
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
      console.error("Error completing onboarding:", error);
      toast.error("Errore durante il completamento dell'onboarding");
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.businessName && formData.businessType;
      case 2:
        return authState.profile?.stripe_connected;
      case 3:
        return formData.businessAddress;
      case 4:
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
              {steps.map((step) => (
                <div key={step.id} className="flex flex-col items-center space-y-2">
                  <div className={`rounded-full p-3 ${
                    step.id <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{step.title}</p>
                    {step.id < currentStep && (
                      <CheckCircle className="w-4 h-4 text-green-600 mx-auto mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === 1 && (
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

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Setup Pagamenti</h3>
              <p className="text-muted-foreground">
                Per ricevere pagamenti dai coworker, devi configurare il tuo account Stripe.
                Questo passaggio è obbligatorio per diventare host.
              </p>
              
              <StripeSetup />
              
              {!authState.profile?.stripe_connected && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-amber-800 font-medium">
                    ⚠️ Devi completare la configurazione Stripe per procedere
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
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

          {currentStep === 4 && (
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
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Indietro
              </Button>
            )}
            
            <div className="ml-auto">
              {currentStep < steps.length ? (
                <Button onClick={handleNext} disabled={!isStepValid()}>
                  Avanti
                </Button>
              ) : (
                <Button onClick={handleComplete} disabled={!isStepValid()}>
                  Completa Setup
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};