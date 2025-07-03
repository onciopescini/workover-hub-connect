
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Users, Target, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';

const About = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();

  const handleRegisterClick = () => {
    // Se l'utente è già autenticato, reindirizza alla dashboard appropriata
    if (authState.isAuthenticated && authState.profile) {
      switch (authState.profile.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'host':
          navigate('/host');
          break;
        case 'coworker':
        default:
          navigate('/dashboard');
          break;
      }
    } else {
      // Se non autenticato, vai alla pagina di registrazione
      navigate('/register');
    }
  };

  const handleContactClick = () => {
    navigate('/contact');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-50 to-emerald-50 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Chi siamo
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Workover è la piattaforma italiana che rivoluziona il modo di lavorare, 
            connettendo professionisti con spazi di lavoro flessibili e una community dinamica.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">La nostra missione</h2>
            <p className="text-lg text-gray-600">
              Crediamo che il futuro del lavoro sia flessibile, collaborativo e orientato alla community. 
              La nostra missione è democratizzare l'accesso a spazi di lavoro di qualità e 
              facilitare connessioni professionali significative.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Spazi Unici</h3>
                <p className="text-gray-600">
                  Dalla casa privata all'ufficio professionale, offriamo accesso a spazi diversificati
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Community</h3>
                <p className="text-gray-600">
                  Una rete di professionisti che condividono valori e obiettivi comuni
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Flessibilità</h3>
                <p className="text-gray-600">
                  Lavora quando e dove vuoi, adattando l'ambiente alle tue esigenze
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Qualità</h3>
                <p className="text-gray-600">
                  Tutti gli spazi sono verificati per garantire standard elevati
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">La nostra storia</h2>
            <div className="prose prose-lg mx-auto">
              <p className="text-gray-600 mb-6">
                Workover nasce dall'idea che il lavoro moderno non debba essere limitato da confini fisici 
                o strutture rigide. Nel 2024, un team di imprenditori e tecnologi ha deciso di creare 
                una piattaforma che potesse rispondere alle esigenze del lavoratore contemporaneo.
              </p>
              <p className="text-gray-600 mb-6">
                Partendo dall'osservazione che molti professionisti cercavano alternative agli uffici 
                tradizionali, abbiamo sviluppato una soluzione che mette in contatto chi offre spazi 
                con chi li cerca, creando opportunità di networking e collaborazione.
              </p>
              <p className="text-gray-600">
                Oggi Workover è una community in crescita che abbraccia la filosofia del lavoro flessibile, 
                sostenibile e orientato alle relazioni umane.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-indigo-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Unisciti alla community Workover
          </h2>
          <p className="text-indigo-100 mb-8 max-w-2xl mx-auto">
            Che tu sia un professionista in cerca di spazi o un host che vuole condividere 
            il proprio ambiente di lavoro, c'è posto per te nella nostra community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-indigo-600 hover:bg-gray-100"
              onClick={handleRegisterClick}
            >
              {authState.isAuthenticated ? 'Vai alla Dashboard' : 'Registrati Ora'}
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-indigo-600"
              onClick={handleContactClick}
            >
              Contattaci
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
