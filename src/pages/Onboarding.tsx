import React, { useState, useEffect } from 'react';
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
  const [formData, setFormData] = useState({
    role: '',
    first_name: '',
    last_name: '',
    bio: '',
    interests: [] as string[],
  });

  // Simplified redirect logic
  useEffect(() => {
    if (!authState.isLoading && authState.profile?.onboarding_completed) {
      // User has already completed onboarding, redirect to appropriate dashboard
      const redirectTo = authState.profile?.role === "admin" ? "/admin" :
                        authState.profile?.role === "host" ? "/host/dashboard" : 
                        "/app/spaces";
      navigate(redirectTo, { replace: true });
    }
  }, [authState.isLoading, authState.profile?.onboarding_completed, authState.profile?.role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.role || !formData.first_name || !formData.last_name) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setIsLoading(true);

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
      
      // Simplified navigation logic
      const redirectTo = formData.role === "admin" ? "/admin" :
                        formData.role === "host" ? "/host/dashboard" : 
                        "/app/spaces";
      
      // Use replace to prevent back navigation to onboarding
      navigate(redirectTo, { replace: true });
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Errore nel completamento del profilo');
    } finally {
      setIsLoading(false);
    }
  };

  const addInterest = (interest: string) => {
    if (!formData.interests.includes(interest)) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, interest]
      }));
    }
  };

  const removeInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

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
              <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
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
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Il tuo nome"
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Cognome *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Il tuo cognome"
                  required
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio">Descrizione (opzionale)</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Raccontaci qualcosa di te..."
                rows={3}
              />
            </div>

            {/* Interests */}
            <div>
              <Label>Interessi (opzionale)</Label>
              <div className="mt-2">
                <Select onValueChange={addInterest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aggiungi un interesse" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEREST_OPTIONS.filter(option => !formData.interests.includes(option)).map((option) => (
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
              disabled={isLoading}
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
