
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import LoadingScreen from "@/components/LoadingScreen";
import { AlertTriangle, User, MapPin, Briefcase } from "lucide-react";

const Onboarding = () => {
  const { authState, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    bio: "",
    location: "",
    linkedinUrl: "",
    skills: "",
    interests: ""
  });

  console.log("🔵 Onboarding - Auth State:", {
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    profile: authState.profile ? {
      id: authState.profile.id,
      role: authState.profile.role,
      onboardingCompleted: authState.profile.onboarding_completed
    } : null
  });

  // Redirect se già completato onboarding o se admin
  useEffect(() => {
    if (!authState.isLoading) {
      if (!authState.isAuthenticated) {
        console.log("🔴 Non autenticato, redirect a login");
        navigate("/login", { replace: true });
        return;
      }

      if (authState.profile?.role === "admin") {
        console.log("🔵 Admin detected, redirect a admin panel");
        navigate("/admin", { replace: true });
        return;
      }

      if (authState.profile?.onboarding_completed) {
        console.log("🔵 Onboarding già completato, redirect a dashboard");
        const dashboardUrl = authState.profile.role === "host" ? "/host/dashboard" : "/dashboard";
        navigate(dashboardUrl, { replace: true });
        return;
      }

      // Pre-compila dati se disponibili
      if (authState.profile) {
        setFormData(prev => ({
          ...prev,
          firstName: authState.profile?.first_name || "",
          lastName: authState.profile?.last_name || "",
          role: authState.profile?.role || "",
          bio: authState.profile?.bio || "",
          location: authState.profile?.location || "",
          linkedinUrl: authState.profile?.linkedin_url || "",
          skills: authState.profile?.skills || "",
          interests: authState.profile?.interests || ""
        }));
      }
    }
  }, [authState, navigate]);

  if (authState.isLoading) {
    return <LoadingScreen />;
  }

  if (!authState.isAuthenticated) {
    return null; // Redirect in corso
  }

  if (!authState.profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Errore nel caricamento del profilo. Prova a ricaricare la pagina.
            <br />
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Ricarica
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.firstName || !formData.lastName || !formData.role) {
        toast.error("Compila tutti i campi obbligatori");
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      console.log("🔵 Submitting onboarding data:", formData);

      const updateData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: formData.role as "host" | "coworker",
        bio: formData.bio,
        location: formData.location,
        linkedin_url: formData.linkedinUrl || null,
        skills: formData.skills,
        interests: formData.interests,
        onboarding_completed: true,
      };

      await updateProfile(updateData);

      toast.success("Onboarding completato!");
      
      // Redirect basato sul ruolo
      const dashboardUrl = formData.role === "host" ? "/host/dashboard" : "/dashboard";
      navigate(dashboardUrl, { replace: true });

    } catch (error) {
      console.error("🔴 Errore onboarding:", error);
      toast.error("Errore nel completamento dell'onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    {
      title: "Informazioni Personali",
      icon: User,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Nome *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                placeholder="Il tuo nome"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Cognome *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                placeholder="Il tuo cognome"
              />
            </div>
          </div>

          <div>
            <Label>Ruolo *</Label>
            <RadioGroup
              value={formData.role}
              onValueChange={(value) => handleInputChange("role", value)}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="coworker" id="coworker" />
                <Label htmlFor="coworker">Coworker - Cerco spazi per lavorare</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="host" id="host" />
                <Label htmlFor="host">Host - Offro spazi di coworking</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      )
    },
    {
      title: "Posizione e Social",
      icon: MapPin,
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="location">Città/Regione</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              placeholder="es. Milano, Lombardia"
            />
          </div>

          <div>
            <Label htmlFor="linkedinUrl">Profilo LinkedIn (opzionale)</Label>
            <Input
              id="linkedinUrl"
              value={formData.linkedinUrl}
              onChange={(e) => handleInputChange("linkedinUrl", e.target.value)}
              placeholder="https://linkedin.com/in/tuo-profilo"
            />
          </div>

          <div>
            <Label htmlFor="bio">Breve descrizione</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="Raccontaci qualcosa di te..."
              rows={3}
            />
          </div>
        </div>
      )
    },
    {
      title: "Competenze e Interessi",
      icon: Briefcase,
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="skills">Competenze professionali</Label>
            <Input
              id="skills"
              value={formData.skills}
              onChange={(e) => handleInputChange("skills", e.target.value)}
              placeholder="es. Design, Marketing, Sviluppo Web"
            />
          </div>

          <div>
            <Label htmlFor="interests">Interessi</Label>
            <Input
              id="interests"
              value={formData.interests}
              onChange={(e) => handleInputChange("interests", e.target.value)}
              placeholder="es. Startup, Tecnologia, Arte"
            />
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep - 1];
  const Icon = currentStepData.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>
                {currentStepData.title}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Passo {currentStep} di {steps.length}
              </p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </CardHeader>

        <CardContent>
          {currentStepData.content}

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={currentStep === 1}
            >
              Indietro
            </Button>

            {currentStep < steps.length ? (
              <Button onClick={handleNextStep}>
                Continua
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Completamento..." : "Completa Onboarding"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
