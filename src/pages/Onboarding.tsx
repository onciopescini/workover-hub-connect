
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, User, Building, Calendar } from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();

  const handleCompleteOnboarding = () => {
    // Reindirizza alla dashboard appropriata dopo il completamento
    if (authState.profile?.role === 'host') {
      navigate('/host');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Benvenuto su Workover! 🎉
        </h1>
        <p className="text-gray-600">
          Completa il tuo profilo per iniziare a utilizzare la piattaforma
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Completa il tuo profilo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Aggiungi le tue informazioni personali e professionali per essere trovato dalla community
            </p>
            <Button onClick={() => navigate('/profile/edit')}>
              Modifica Profilo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-green-600" />
              Esplora gli spazi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Scopri spazi di lavoro unici nella tua zona
            </p>
            <Button variant="outline" onClick={() => navigate('/spaces')}>
              Visualizza Spazi
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Partecipa agli eventi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Unisciti a eventi e workshop per fare networking
            </p>
            <Button variant="outline" onClick={() => navigate('/events')}>
              Visualizza Eventi
            </Button>
          </CardContent>
        </Card>

        <div className="text-center pt-6">
          <Button 
            size="lg" 
            onClick={handleCompleteOnboarding}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Completa Onboarding
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
