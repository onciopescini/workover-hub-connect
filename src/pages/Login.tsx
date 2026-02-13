import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, AlertCircle, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { AUTH_ERRORS } from '@/utils/auth/auth-errors';
import { checkAuthRateLimit, resetAuthRateLimit } from '@/lib/auth-rate-limit';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Resend confirmation state
  const [showResendOption, setShowResendOption] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  
  const location = useLocation();
  const { signIn, signInWithGoogle } = useAuth();

  useEffect(() => {
    // Check for error parameters in URL
    const searchParams = new URLSearchParams(location.search);
    const errorParam = searchParams.get('error');

    if (errorParam === 'role_missing') {
      setError("Impossibile configurare l'account. Contatta il supporto.");
    } else {
      setError(null);
    }
  }, [location]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [resendCooldown]);

  const handleResendConfirmation = async () => {
    if (resendCooldown > 0 || isResending || !email) return;
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      
      if (error) {
        throw error;
      }
      
      toast.success('Email di conferma inviata! Controlla la tua casella di posta.');
      setResendCooldown(60);
    } catch (_err: unknown) {
      toast.error('Impossibile inviare l\'email. Riprova tra poco.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowResendOption(false);

    // Check network connection
    if (!navigator.onLine) {
      toast.error('Nessuna connessione internet. Riprova quando sei online.');
      return;
    }

    // Check client-side rate limit BEFORE setting loading state
    const rateLimitCheck = checkAuthRateLimit(email);
    if (!rateLimitCheck.allowed) {
      toast.error(rateLimitCheck.message || 'Troppi tentativi. Riprova più tardi.');
      return;
    }

    setLoading(true);

    try {
      const searchParams = new URLSearchParams(location.search);
      const returnUrlParam = searchParams.get('returnUrl');
      const redirectToParam = searchParams.get('redirectTo');
      const requestedRoute = returnUrlParam ?? redirectToParam ?? '/';
      const redirectTo = requestedRoute.startsWith('/') ? requestedRoute : '/';

      await signIn(email, password, redirectTo);

      // Reset rate limit on successful login
      resetAuthRateLimit(email);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : AUTH_ERRORS.UNKNOWN_ERROR;
      setError(errorMessage);
      
      // Show resend option if email not confirmed
      if (errorMessage === AUTH_ERRORS.EMAIL_NOT_CONFIRMED) {
        setShowResendOption(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setShowResendOption(false);
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : AUTH_ERRORS.OAUTH_FAILED;
      setError(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center items-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Accedi al tuo account</CardTitle>
          <CardDescription className="text-center">
            Inserisci le tue credenziali per continuare
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            variant="outline"
            className="w-full"
          >
            {googleLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Accesso in corso...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continua con Google</span>
              </div>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Oppure
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mario.rossi@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Inserisci la password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-auto w-auto p-0 data-[state=open]:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">Mostra password</span>
                  </Button>
                </div>
              </div>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Resend confirmation email option */}
            {showResendOption && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground mb-2">
                  Non hai ricevuto l'email di conferma?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendConfirmation}
                  disabled={resendCooldown > 0 || isResending}
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Invio in corso...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Riprova tra ${resendCooldown}s`
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Invia di nuovo l'email
                    </>
                  )}
                </Button>
              </div>
            )}
            
            <Button disabled={loading || googleLoading} className="w-full mt-4">
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Accesso...</span>
                </div>
              ) : (
                <span>Accedi</span>
              )}
            </Button>
          </form>
          <div className="text-sm text-gray-500 text-center">
            Non hai un account? <Link to="/register" className="underline underline-offset-4 hover:text-primary">Registrati</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
