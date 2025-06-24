
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Users, Briefcase, CheckCircle } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

const Onboarding = () => {
  const { authState, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    role: '' as UserRole,
    profession: '',
    bio: '',
    location: '',
    interests: '',
    skills: '',
    networkingEnabled: true,
  });

  const handleRoleSelect = (role: string) => {
    setFormData({ ...formData, role: role as UserRole });
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
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
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: formData.role,
        profession: formData.profession,
        bio: formData.bio,
        location: formData.location,
        interests: formData.interests,
        skills: formData.skills,
        networking_enabled: formData.networkingEnabled,
        onboarding_completed: true,
      });

      toast.success("Onboarding completato con successo!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Errore durante il completamento dell'onboarding");
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName && formData.lastName && formData.role;
      case 2:
        return formData.profession && formData.bio;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Benvenuto in Workover!</CardTitle>
          <CardDescription>
            Completiamo il tuo profilo per offrirti la migliore esperienza
          </CardDescription>
          <div className="flex justify-center space-x-2 mt-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full ${
                  step <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informazioni di base</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Il tuo nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Cognome</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Il tuo cognome"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Seleziona il tuo ruolo</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className={`cursor-pointer border-2 transition-colors ${
                      formData.role === 'coworker' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleRoleSelect('coworker')}
                  >
                    <CardContent className="p-4 text-center">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <h4 className="font-semibold">Coworker</h4>
                      <p className="text-sm text-gray-600">Cerco spazi di lavoro</p>
                    </CardContent>
                  </Card>
                  
                  <Card
                    className={`cursor-pointer border-2 transition-colors ${
                      formData.role === 'host' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleRoleSelect('host')}
                  >
                    <CardContent className="p-4 text-center">
                      <Briefcase className="h-8 w-8 mx-auto mb-2" />
                      <h4 className="font-semibold">Host</h4>
                      <p className="text-sm text-gray-600">Offro spazi di lavoro</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Profilo professionale</h3>
              
              <div className="space-y-2">
                <Label htmlFor="profession">Professione</Label>
                <Input
                  id="profession"
                  value={formData.profession}
                  onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  placeholder="Es: Sviluppatore Web, Designer, Marketing Manager"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Raccontaci qualcosa di te..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Località</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Es: Milano, Roma, Napoli"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preferenze e networking</h3>
              
              <div className="space-y-2">
                <Label htmlFor="interests">Interessi</Label>
                <Input
                  id="interests"
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  placeholder="Es: Tecnologia, Design, Startup, Marketing"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Competenze</Label>
                <Input
                  id="skills"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="Es: JavaScript, Photoshop, Project Management"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="networking"
                  checked={formData.networkingEnabled}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, networkingEnabled: checked as boolean })
                  }
                />
                <Label htmlFor="networking">
                  Abilita il networking per connetterti con altri professionisti
                </Label>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">Quasi fatto!</span>
                </div>
                <p className="text-green-700 mt-1">
                  Stai per completare la registrazione e accedere a tutte le funzionalità di Workover.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Indietro
              </Button>
            )}
            
            <div className="ml-auto">
              {currentStep < 3 ? (
                <Button onClick={handleNext} disabled={!isStepValid()}>
                  Avanti
                </Button>
              ) : (
                <Button onClick={handleComplete} disabled={!isStepValid()}>
                  Completa registrazione
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
