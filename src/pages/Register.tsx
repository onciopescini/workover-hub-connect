import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useAuth";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Building2, Mail, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { sreLogger } from '@/lib/sre-logger';
import { AUTH_ERRORS } from '@/utils/auth/auth-errors';
import { checkAuthRateLimit, resetAuthRateLimit } from '@/lib/auth-rate-limit';
import { supabase } from '@/integrations/supabase/client';

// Password regex matching Supabase requirements
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Registration success state
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  
  const { signUp, signInWithGoogle, authState } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (authState.isAuthenticated && !authState.isLoading) {
      navigate('/dashboard');
    }
  }, [authState.isAuthenticated, authState.isLoading, navigate]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [resendCooldown]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);

    // Clear weak password error if full requirements are met
    if (error === AUTH_ERRORS.WEAK_PASSWORD && passwordRegex.test(newPassword)) {
      setError('');
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);

    // Clear mismatch error if passwords match
    if (error === AUTH_ERRORS.PASSWORD_MISMATCH && newConfirmPassword === password) {
      setError('');
    }
  };

  const handleResendConfirmation = async () => {
    if (resendCooldown > 0 || isResending) return;
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
      });
      
      if (error) {
        throw error;
      }
      
      toast.success('Email di conferma inviata!');
      setResendCooldown(60);
    } catch (err: any) {
      sreLogger.error('Resend confirmation failed', { email: registeredEmail }, err);
      toast.error('Impossibile inviare l\'email. Riprova tra poco.');
    } finally {
      setIsResending(false);
    }
  };

  const handleResetForm = () => {
    setRegistrationComplete(false);
    setRegisteredEmail('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password match
    if (password !== confirmPassword) {
      setError(AUTH_ERRORS.PASSWORD_MISMATCH);
      return;
    }

    if (!passwordRegex.test(password)) {
      setError(AUTH_ERRORS.WEAK_PASSWORD);
      return;
    }

    // Check client-side rate limit BEFORE setting loading state
    const rateLimitCheck = checkAuthRateLimit(email);
    if (!rateLimitCheck.allowed) {
      toast.error(rateLimitCheck.message || 'Troppi tentativi. Riprova più tardi.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp(email, password);
      
      // Reset rate limit on successful signup
      resetAuthRateLimit(email);
      
      if (result.needsEmailConfirmation) {
        // Show success state with email confirmation instructions
        setRegisteredEmail(email);
        setRegistrationComplete(true);
      } else {
        // Auto-login succeeded (rare, depends on Supabase settings)
        toast.success('Registrazione completata!');
        navigate('/profile');
      }
    } catch (err: any) {
      sreLogger.error('Registration failed', { email }, err);
      const errorMessage = err.message || AUTH_ERRORS.UNKNOWN_ERROR;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signInWithGoogle();
      toast.success('Registrazione con Google completata!');
    } catch (err: any) {
      sreLogger.error('Google sign up failed', {}, err);
      const errorMessage = err.message || AUTH_ERRORS.OAUTH_FAILED;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state - show email confirmation instructions
  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and header */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Workover</h1>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Controlla la tua email</CardTitle>
              <CardDescription className="mt-2">
                Abbiamo inviato un link di conferma a:
              </CardDescription>
              <p className="font-medium text-foreground mt-1">{registeredEmail}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-muted border-muted-foreground/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Clicca sul link nell'email per attivare il tuo account e poter effettuare l'accesso.
                </AlertDescription>
              </Alert>

              <div className="text-sm text-muted-foreground text-center">
                Non hai ricevuto l'email? Controlla la cartella spam oppure:
              </div>

              <Button
                onClick={handleResendConfirmation}
                variant="outline"
                className="w-full"
                disabled={resendCooldown > 0 || isResending}
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

              <div className="flex flex-col items-center gap-3 pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={handleResetForm}
                  className="text-sm"
                >
                  Usa un'email diversa
                </Button>
                <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                  Vai al login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Workover</h1>
          <p className="mt-2 text-gray-600">Crea il tuo account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registrati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="tua@email.com"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    disabled={isLoading}
                    placeholder="Crea una password sicura"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimo 8 caratteri, includi maiuscola, minuscola, numero e carattere speciale
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Conferma Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    required
                    disabled={isLoading}
                    placeholder="Ripeti la password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Registrazione in corso...' : 'Registrati'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">oppure</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignUp}
              disabled={isLoading}
            >
              Registrati con Google
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Hai già un account?{' '}
                <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
                  Accedi
                </Link>
              </p>
              <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
                Torna alla home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
