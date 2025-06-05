
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AgeVerificationDialog } from "@/components/gdpr/AgeVerificationDialog";
import { supabase } from "@/integrations/supabase/client";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Le password non corrispondono");
      return;
    }

    if (password.length < 6) {
      toast.error("La password deve essere di almeno 6 caratteri");
      return;
    }

    // Show age verification dialog
    setShowAgeVerification(true);
  };

  const handleAgeVerificationConfirm = async () => {
    setIsLoading(true);
    setShowAgeVerification(false);
    
    try {
      await signUp(email, password);
      
      // Update profile with age confirmation
      const { data: user } = await supabase.auth.getUser();
      if (user?.user) {
        await supabase
          .from('profiles')
          .update({ age_confirmed: true })
          .eq('id', user.user.id);
      }

      toast.success("Account creato con successo! Controlla la tua email per confermare la registrazione.");
      navigate("/onboarding");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Errore durante la registrazione");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgeVerificationCancel = () => {
    setShowAgeVerification(false);
    toast.info("Devi confermare di avere almeno 18 anni per registrarti");
  };

  const handleGoogleSignUp = async () => {
    // Show age verification for Google signup too
    setShowAgeVerification(true);
  };

  const handleGoogleAgeVerificationConfirm = async () => {
    setIsLoading(true);
    setShowAgeVerification(false);
    
    try {
      await signInWithGoogle();
      
      // Age confirmation will be handled in the auth callback
      toast.success("Registrazione con Google completata!");
    } catch (error: any) {
      console.error("Google signup error:", error);
      toast.error(error.message || "Errore durante la registrazione con Google");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-md w-full space-y-8">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Registrati su Workover
            </CardTitle>
            <CardDescription className="text-center">
              Crea il tuo account per iniziare a trovare spazi di coworking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="il-tuo-email@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Creazione account..." : "Crea Account"}
              </Button>
            </form>

            <Separator />

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignUp}
              disabled={isLoading}
            >
              Registrati con Google
            </Button>

            <div className="text-center">
              <span className="text-sm text-gray-600">
                Hai già un account?{" "}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Accedi qui
                </Link>
              </span>
            </div>

            <div className="text-xs text-gray-500 text-center">
              Registrandoti accetti i nostri{" "}
              <Link to="/terms" className="underline">
                Termini di Servizio
              </Link>{" "}
              e la{" "}
              <Link to="/privacy" className="underline">
                Privacy Policy
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <AgeVerificationDialog
        isOpen={showAgeVerification}
        onConfirm={email ? handleAgeVerificationConfirm : handleGoogleAgeVerificationConfirm}
        onCancel={handleAgeVerificationCancel}
      />
    </>
  );
};

export default Signup;
