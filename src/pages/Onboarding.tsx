import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { NavigationGuard } from "@/components/navigation/NavigationGuard";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { sreLogger } from "@/lib/sre-logger";
import { sanitizeOnboardingProfileUpdate } from "@/utils/profile/sanitizeProfileUpdate";

interface OnboardingFormData {
  firstName: string;
  lastName: string;
  bio: string;
  avatarUrl: string;
}

const Onboarding = () => {
  const { authState, updateProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<OnboardingFormData>({
    firstName: "",
    lastName: "",
    bio: "",
    avatarUrl: "",
  });

  const draftKey = authState.user ? `onboarding_draft_${authState.user.id}` : null;

  useEffect(() => {
    if (!authState.user) return;

    try {
      if (draftKey) {
        const rawDraft = localStorage.getItem(draftKey);
        if (rawDraft) {
          const parsedDraft = JSON.parse(rawDraft) as Partial<OnboardingFormData>;
          setFormData((prev) => ({ ...prev, ...parsedDraft }));
          return;
        }
      }

      setFormData((prev) => ({
        ...prev,
        firstName: authState.profile?.first_name ?? prev.firstName,
        lastName: authState.profile?.last_name ?? prev.lastName,
        bio: authState.profile?.bio ?? prev.bio,
        avatarUrl: authState.profile?.profile_photo_url ?? prev.avatarUrl,
      }));
    } catch {
      // no-op
    }
  }, [authState.user, authState.profile, draftKey]);

  useEffect(() => {
    if (!authState.user || authState.profile?.onboarding_completed) return;

    try {
      if (draftKey) {
        localStorage.setItem(draftKey, JSON.stringify(formData));
      }
    } catch {
      // no-op
    }
  }, [authState.user, authState.profile?.onboarding_completed, draftKey, formData]);

  const hasAnyData = useMemo(() => {
    return Boolean(
      formData.firstName.trim() ||
        formData.lastName.trim() ||
        formData.bio.trim() ||
        formData.avatarUrl.trim(),
    );
  }, [formData]);

  const isValid = formData.firstName.trim().length > 0 && formData.lastName.trim().length > 0;

  const handleComplete = async () => {
    try {
      const onboardingPayload = sanitizeOnboardingProfileUpdate({
        first_name: formData.firstName,
        last_name: formData.lastName,
        bio: formData.bio,
        profile_photo_url: formData.avatarUrl || null,
      });

      await updateProfile(onboardingPayload);

      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.refetchQueries({ queryKey: ["profile"], type: "active" });

      // Small buffer to let observers consume the refetched profile before redirect guards run.
      await new Promise((resolve) => setTimeout(resolve, 50));

      toast.success("Profilo completato con successo!");
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }
      navigate("/spaces", { replace: true });
    } catch (error) {
      sreLogger.error("Failed to complete onboarding", { userId: authState.user?.id }, error as Error);
      toast.error("Errore durante il completamento dell'onboarding");
    }
  };

  const handleResendVerification = async () => {
    try {
      if (!authState.user?.email) return;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: authState.user.email,
      });
      if (error) throw error;
      toast.success("Email di verifica inviata! Controlla la tua casella di posta.");
    } catch {
      toast.error("Impossibile inviare l'email di verifica. Riprova più tardi.");
    }
  };

  return (
    <>
      <NavigationGuard
        when={Boolean(authState.isAuthenticated && !authState.profile?.onboarding_completed && hasAnyData)}
        title="Vuoi lasciare l'onboarding?"
        description="Hai modifiche non salvate. Uscendo potresti perdere i progressi. Vuoi davvero continuare?"
      />

      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Completa il tuo profilo</CardTitle>
            <CardDescription>
              Configura la tua identità coworker con le informazioni di base.
            </CardDescription>

            {authState.user && !authState.user.email_confirmed_at && (
              <div className="mt-3 p-3 rounded-md bg-blue-50 text-blue-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-left">
                  <Mail className="w-4 h-4" />
                  <span>Email non verificata. Controlla la tua casella o invia di nuovo.</span>
                </div>
                <Button size="sm" variant="outline" onClick={handleResendVerification}>
                  Reinvia
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informazioni di base</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Il tuo nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Cognome</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Il tuo cognome"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Racconta qualcosa di te"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Avatar</Label>
                <AvatarUploader
                  currentPhotoUrl={formData.avatarUrl}
                  onUploadComplete={(url) => setFormData((prev) => ({ ...prev, avatarUrl: url }))}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleComplete} disabled={!isValid}>
                Completa registrazione
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Onboarding;
