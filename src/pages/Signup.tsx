import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [isConfirmPasswordValid, setIsConfirmPasswordValid] = useState(false);
  const [isMatchingPasswords, setIsMatchingPasswords] = useState(true);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  useEffect(() => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsEmailValid(emailRegex.test(email));

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;
    setIsPasswordValid(passwordRegex.test(password));

    // Confirm password validation
    setIsConfirmPasswordValid(confirmPassword.length > 0);

    // Check if passwords match
    setIsMatchingPasswords(password === confirmPassword);
  }, [email, password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !isMatchingPasswords) {
      setError("Please fill in all fields correctly.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signUp(email, password);
      navigate('/login');
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center items-center py-12">
      <Card className="w-full max-w-md space-y-4">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Crea un account</CardTitle>
          <CardDescription className="text-muted-foreground text-center">
            Inserisci la tua email e password per registrarti
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Inserisci la tua email"
                disabled={isLoading}
              />
              {!isEmailValid && email.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Inserisci un'email valida.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Inserisci la tua password"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {!isPasswordValid && password.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    La password deve essere di almeno 8 caratteri e contenere almeno una lettera maiuscola, una lettera minuscola, un numero e un carattere speciale.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Conferma Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Conferma la tua password"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {!isConfirmPasswordValid && confirmPassword.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Conferma la tua password.
                  </AlertDescription>
                </Alert>
              )}
              {!isMatchingPasswords && confirmPassword.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Le password non corrispondono.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
            <Button disabled={isLoading} className="w-full" type="submit">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Attendere...
                </>
              ) : (
                <>
                  Crea account
                  <CheckCircle className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
          <div className="text-sm text-muted-foreground text-center">
            Hai già un account?{" "}
            <Link to="/login" className="text-primary underline">
              Accedi
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
