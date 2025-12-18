
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Users, Briefcase, CheckCircle, Mail, Search, Building } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { NavigationGuard } from '@/components/navigation/NavigationGuard';
import { sreLogger } from '@/lib/sre-logger';
import { hasAnyRole } from '@/lib/auth/role-utils';

type UserRole = Database["public"]["Enums"]["app_role"];

const Onboarding = () => {
  const { authState, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  // If user already has a role, we skip the selection step.
  // We initialize currentStep based on whether a role exists.
  const [currentStep, setCurrentStep] = useState(0); // 0 = Role Selection
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    role: '' as UserRole | '', // Allow empty initially
    profession: '',
    bio: '',
    location: '',
    interests: '',
    skills: '',
    networkingEnabled: true,
    collaborationAvailability: 'not_available',
    collaborationTypes: [] as string[],
    preferredWorkMode: 'flessibile',
    collaborationDescription: ''
  });

  const draftKey = authState.user ? `onboarding_draft_${authState.user.id}` : null;

  // Initial load effect
  useEffect(() => {
    if (!authState.user) return;

    // Determine initial step based on existing role
    if (authState.roles.length > 0) {
       // If host, they should be in dashboard, but if they came here manually,
       // or if they are just a 'user', we might show the wizard.
       // However, the instructions say 'host' redirects to dashboard.
       if (hasAnyRole(authState.roles, ['host'])) {
         navigate('/host/dashboard');
         return;
       }
       // If user/coworker, we assume they want to complete profile
       setCurrentStep(1);
       setFormData(prev => ({ ...prev, role: 'user' }));
    } else {
       setCurrentStep(0);
    }

    try {
      if (draftKey) {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          setFormData(prev => ({ ...prev, ...parsed }));
          return;
        }
      }
      // Prefill da profilo esistente se disponibile
      setFormData(prev => ({
        ...prev,
        firstName: (authState.profile?.first_name as string | undefined) ?? prev.firstName,
        lastName: (authState.profile?.last_name as string | undefined) ?? prev.lastName,
        // Don't override role from DB if we just set it above
        role: (authState.roles[0] as UserRole | undefined) ?? prev.role,
        profession: (authState.profile?.profession as string | undefined) ?? prev.profession,
        bio: (authState.profile?.bio as string | undefined) ?? prev.bio,
        location: (authState.profile?.location as string | undefined) ?? prev.location,
      }));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.user?.id, authState.roles]); // Added authState.roles dependency

  useEffect(() => {
    if (!authState.user || authState.profile?.onboarding_completed) return;
    try {
      if (draftKey) {
        localStorage.setItem(draftKey, JSON.stringify(formData));
      }
    } catch {}
  }, [formData, draftKey, authState.user, authState.profile?.onboarding_completed]);

  const handleRoleSelection = async (selectedRole: UserRole) => {
    if (!authState.user) return;

    try {
      // Immediate role assignment
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authState.user.id,
          role: selectedRole
        });

      if (roleError) {
         // Ignore duplicate key error in case of race conditions
         if (roleError.code !== '23505') {
            throw roleError;
         }
      }

      // Refresh local auth state to reflect the new role
      await refreshProfile();

      if (selectedRole === 'host') {
        toast.success("Account Host creato! Benvenuto nella dashboard.");
        navigate('/host/dashboard');
      } else {
        // User/Coworker -> Continue to wizard
        setFormData(prev => ({ ...prev, role: selectedRole }));
        setCurrentStep(1);
        toast.success("Profilo creato! Ora parlaci un po' di te.");
      }

    } catch (error) {
      sreLogger.error("Failed to assign initial role", { userId: authState.user.id, role: selectedRole }, error as Error);
      toast.error("Errore durante l'assegnazione del ruolo. Riprova.");
    }
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
      // Update profile
      await updateProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        profession: formData.profession,
        bio: formData.bio,
        location: formData.location,
        interests: formData.interests,
        skills: formData.skills,
        networking_enabled: formData.networkingEnabled,
        collaboration_availability: formData.collaborationAvailability,
        collaboration_types: formData.collaborationTypes,
        preferred_work_mode: formData.preferredWorkMode,
        collaboration_description: formData.collaborationDescription,
        onboarding_completed: true,
      });

      // NOTE: We do NOT insert role here anymore, as it was done in Step 0.
      // However, for robustness, if for some reason it's missing (legacy flow?), we could try upsert,
      // but Step 0 guarantees it.

      toast.success("Onboarding completato con successo!");
      
      // Pulisci eventuale bozza salvata
      try {
        if (draftKey) localStorage.removeItem(draftKey);
      } catch {}
      
      if (formData.role === 'host') {
        navigate("/host/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      sreLogger.error("Failed to complete onboarding", { userId: authState.user?.id }, error as Error);
      toast.error("Errore durante il completamento dell'onboarding");
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName && formData.lastName; // Role is already set
      case 2:
        return formData.profession && formData.bio;
      case 3:
        return true;
      default:
        return false;
    }
  };

  // Resend email verification
  const handleResendVerification = async () => {
    try {
      if (!authState.user?.email) return;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: authState.user.email,
      });
      if (error) throw error;
      toast.success("Email di verifica inviata! Controlla la tua casella di posta.");
    } catch (e) {
      toast.error("Impossibile inviare l'email di verifica. Riprova più tardi.");
    }
  };

  // Autosave su server (debounced)
  const autosaveTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (!authState.user || authState.profile?.onboarding_completed || currentStep === 0) return;
    window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(async () => {
      try {
        const uid = authState.user?.id;
        if (!uid) return;
        await supabase.from('profiles').update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          profession: formData.profession,
          bio: formData.bio,
          location: formData.location,
          interests: formData.interests,
          skills: formData.skills,
          networking_enabled: formData.networkingEnabled,
          collaboration_availability: formData.collaborationAvailability,
          collaboration_types: formData.collaborationTypes,
          preferred_work_mode: formData.preferredWorkMode,
          collaboration_description: formData.collaborationDescription,
        }).eq('id', uid);
      } catch {}
    }, 800);
    return () => window.clearTimeout(autosaveTimer.current);
  }, [formData, authState.user?.id, authState.profile?.onboarding_completed, currentStep]);

  // Stato: ci sono dati parziali?
  const hasAnyData = React.useMemo(() => {
    return Object.values(formData).some((v) => {
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'boolean') return v === true;
      return typeof v === 'string' ? v.trim().length > 0 : false;
    });
  }, [formData]);


  return (
    <>
      <NavigationGuard
        when={Boolean(authState.isAuthenticated && !authState.profile?.onboarding_completed && hasAnyData && currentStep > 0)}
        title="Vuoi lasciare l'onboarding?"
        description="Hai modifiche non salvate. Uscendo potresti perdere i progressi. Vuoi davvero continuare?"
      />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Benvenuto in Workover!</CardTitle>
            <CardDescription>
              {currentStep === 0
                ? "Come vuoi utilizzare la piattaforma?"
                : "Completiamo il tuo profilo per offrirti la migliore esperienza"
              }
            </CardDescription>
          {authState.user && !authState.user.email_confirmed_at && (
            <div className="mt-3 p-3 rounded-md bg-blue-50 text-blue-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>Email non verificata. Controlla la tua casella o invia di nuovo.</span>
              </div>
              <Button size="sm" variant="outline" onClick={handleResendVerification}>Reinvia</Button>
            </div>
          )}

          {currentStep > 0 && (
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
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <Card
                className="cursor-pointer border-2 hover:border-blue-500 hover:bg-blue-50 transition-all group h-full"
                onClick={() => handleRoleSelection('host')}
              >
                <CardContent className="p-6 text-center flex flex-col items-center h-full justify-center space-y-4">
                  <div className="p-4 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                    <Building className="h-10 w-10 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Diventa Host</h3>
                    <p className="text-muted-foreground text-sm">
                      Hai uno spazio da condividere? Pubblicalo e inizia a guadagnare ospitando professionisti.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer border-2 hover:border-green-500 hover:bg-green-50 transition-all group h-full"
                onClick={() => handleRoleSelection('user')}
              >
                <CardContent className="p-6 text-center flex flex-col items-center h-full justify-center space-y-4">
                  <div className="p-4 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                    <Search className="h-10 w-10 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Diventa Coworker</h3>
                    <p className="text-muted-foreground text-sm">
                      Cerchi un luogo dove lavorare? Trova uffici, scrivanie e sale riunioni su misura per te.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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

          {currentStep > 0 && (
            <div className="flex justify-between pt-4">
              {/* Only show 'Back' if we are past Step 1. Step 1 shouldn't go back to Step 0 easily if role is set.
                  However, user might have made a mistake. But since role is written to DB,
                  going back would require removing role or handling complex state.
                  For now, let's keep it simple: Once chosen, you are that role.
              */}
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
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default Onboarding;
