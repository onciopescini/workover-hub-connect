
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Users, Calendar, Star } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (authState.isAuthenticated && !authState.isLoading) {
      navigate('/dashboard');
    }
  }, [authState.isAuthenticated, authState.isLoading, navigate]);

  // Show loading while checking auth
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Show marketing page for non-authenticated users
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-50 to-emerald-50 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Il futuro del lavoro è <span className="text-indigo-600">flessibile</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Scopri spazi di lavoro unici, connettiti con professionisti e partecipa a eventi
            che trasformeranno la tua esperienza lavorativa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => navigate('/spaces')}
            >
              Esplora Spazi
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              onClick={() => navigate('/events')}
            >
              Scopri Eventi
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perché scegliere Workover?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Una piattaforma completa per trasformare il tuo modo di lavorare
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Spazi Unici</h3>
                <p className="text-gray-600">
                  Dalle case private agli uffici professionali, trova lo spazio perfetto per ogni esigenza
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Networking</h3>
                <p className="text-gray-600">
                  Connettiti con professionisti che condividono i tuoi interessi e obiettivi
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Eventi</h3>
                <p className="text-gray-600">
                  Partecipa a eventi esclusivi e workshop per crescere professionalmente
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-indigo-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Inizia oggi la tua esperienza Workover
          </h2>
          <p className="text-indigo-100 mb-8 max-w-2xl mx-auto">
            Unisciti a migliaia di professionisti che hanno già trasformato il loro modo di lavorare
          </p>
          <Button 
            size="lg" 
            className="bg-white text-indigo-600 hover:bg-gray-100"
            onClick={() => navigate('/signup')}
          >
            Inizia Gratis
          </Button>
        </div>
      </section>
    </>
  );
};

export default Index;
