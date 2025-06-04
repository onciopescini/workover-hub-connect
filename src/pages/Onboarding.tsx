
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import LoadingScreen from '@/components/LoadingScreen';
import { UserRole } from '@/types/auth';

const INTEREST_OPTIONS = [
  'Tecnologia', 'Marketing', 'Design', 'Sviluppo Web', 'Fotografia',
  'Writing', 'Business', 'Startup', 'E-commerce', 'Consulenza',
  'Educazione', 'Ricerca', 'Arte', 'Musica', 'Fitness'
];

const Onboarding = () => {
  const { authState, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const hasNavigated = useRef(false);
  const [formData, setFormData] = useState({
    role: '',
    first_name: '',
    last_name: '',
    bio: '',
    interests: [] as string[],
  });

  // Memoized redirect URL calculation
  const getRedirectUrl = useCallback((role: string) => {
    return role === "admin" ? "/admin" :
           role === "host" ? "/host/dashboard" : 
           "/app/spaces";
  }, []);

  // Stabilized redirect logic with aggressive checks to prevent loops
  useEffect(() => {
    if (!authState.isLoading && 
        authState.profile?.onboarding_completed && 
        !hasNavigated.current) {
      
      hasNavigated.current = true;
      const redirectTo = getRedirectUrl(authState.profile.role);
      
      // Use replace to prevent back navigation to onboarding
      navigate(redirectTo, { replace: true });
    }
  }, [authState.isLoading, authState.profile?.onboarding_completed, authState.profile?.role, navigate, getRedirectUrl]);

  // Enhanced form submission with preventDefault and navigation throttling
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent double submissions
    if (hasSubmitted || isLoading) {
      return;
    }
    
    if (!formData.role || !formData.first_name || !formData.last_name) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setIsLoading(true);
    setHasSubmitted(true);

    try {
      // Convert interests array to comma-separated string for database
      const interestsString = formData.interests.length > 0 ? formData.interests.join(',') : '';
      
      await updateProfile({
        role: formData.role as UserRole,
        first_name: formData.first_name,
        last_name: formData.last_name,
        bio: formData.bio,
        interests: interestsString,
        onboarding_completed: true,
      });

      toast.success('Profilo completato con successo!');
      
      // Throttled navigation with explicit target
      const redirectTo = getRedirectUrl(formData.role);
      hasNavigated.current = true;
      
      // Use replace to prevent back navigation to onboarding
      navigate(redirectTo, { replace: true });
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Errore nel completamento del profilo');
      setHasSubmitted(false); // Reset on error to allow retry
    } finally {
      setIsLoading(false);
    }
  }, [formData, hasSubmitted, isLoading, updateProfile, navigate, getRedirectUrl]);

  // Optimized form data handlers with memoization
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const addInterest = useCallback((interest: string) => {
    if (!formData.interests.includes(interest)) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, interest]
      }));
    }
  }, [formData.interests]);

  const removeInterest = useCallback((interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  }, []);

  // Memoized available interests to prevent recalculation
  const availableInterests = useMemo(() => 
    INTEREST_OPTIONS.filter(option => !formData.interests.includes(option)),
    [formData.interests]
  );

  // Show loading screen while checking auth state
  if (authState.isLoading) {
    return <LoadingScreen />;
  }

  // If user is not authenticated, redirect to login
  if (!authState.isAuthenticated) {
    navigate('/login', { replace: true });
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            Completa il tuo profilo
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Aiutaci a personalizzare la tua esperienza su Workover
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <Label htmlFor="role">Qual è il tuo ruolo? *</Label>
              <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona il tuo ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coworker">Coworker - Cerco spazi per lavorare</SelectItem>
                  <SelectItem value="host">Host - Offro spazi per il coworking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Nome *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Il tuo nome"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Cognome *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Il tuo cognome"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio">Descrizione (opzionale)</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Raccontaci qualcosa di te..."
                rows={3}
                disabled={isLoading}
              />
            </div>

            {/* Interests */}
            <div>
              <Label>Interessi (opzionale)</Label>
              <div className="mt-2">
                <Select onValueChange={addInterest} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aggiungi un interesse" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInterests.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="flex items-center gap-1">
                      {interest}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeInterest(interest)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={isLoading || hasSubmitted}
            >
              {isLoading ? 'Completamento in corso...' : 'Completa Profilo'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
