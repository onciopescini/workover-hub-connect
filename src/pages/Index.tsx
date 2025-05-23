
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Calendar, CreditCard, Bell, Search } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Search,
      title: "Ricerca Spazi",
      description: "Trova il workspace perfetto per le tue esigenze, ovunque ti trovi."
    },
    {
      icon: Users,
      title: "Networking",
      description: "Connettiti con professionisti e costruisci la tua rete di contatti."
    },
    {
      icon: Calendar,
      title: "Eventi",
      description: "Partecipa a eventi esclusivi e workshop nel tuo settore."
    },
    {
      icon: CreditCard,
      title: "Pagamenti Sicuri",
      description: "Transazioni protette e immediate con integrazione Stripe."
    },
    {
      icon: Bell,
      title: "Notifiche Smart",
      description: "Resta aggiornato su prenotazioni, messaggi e opportunità."
    },
    {
      icon: Building2,
      title: "Gestione Spazi",
      description: "Per gli host: gestisci i tuoi spazi e massimizza i guadagni."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-emerald-50">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Dai nuova vita agli spazi.
              <span className="text-indigo-600 block">Lavora dove vuoi.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Workover connette professionisti e spazi di lavoro flessibili. 
              Trova il workspace perfetto o monetizza i tuoi spazi inutilizzati.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate("/signup")}
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 px-8 py-3 text-lg"
              >
                Inizia ora – Registrati gratis
              </Button>
              <Button 
                onClick={() => navigate("/login")}
                variant="outline"
                size="lg"
                className="px-8 py-3 text-lg border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              >
                Accedi
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* How it works section */}
      <div className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Come funziona Workover
            </h2>
            <p className="text-lg text-gray-600">
              Due modi per essere parte della community
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* For Coworkers */}
            <Card className="p-8 border-2 border-indigo-100 hover:border-indigo-200 transition-colors">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-indigo-600" />
                </div>
                <CardTitle className="text-2xl text-indigo-600">Per Coworker</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Cerca spazi di lavoro nella tua città</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Prenota con un click e paga in sicurezza</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Connettiti con altri professionisti</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Partecipa a eventi esclusivi</p>
                </div>
              </CardContent>
            </Card>

            {/* For Hosts */}
            <Card className="p-8 border-2 border-emerald-100 hover:border-emerald-200 transition-colors">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl text-emerald-600">Per Host</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Elenca i tuoi spazi inutilizzati</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Gestisci prenotazioni e disponibilità</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Ricevi pagamenti automatici</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-600">Costruisci la tua community</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tutto quello che ti serve
            </h2>
            <p className="text-lg text-gray-600">
              Una piattaforma completa per il lavoro flessibile
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Icon className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="py-20 bg-indigo-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pronto a trasformare il tuo modo di lavorare?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Unisciti a migliaia di professionisti che hanno già scelto Workover 
            per il loro workspace ideale.
          </p>
          <Button 
            onClick={() => navigate("/signup")}
            size="lg"
            className="bg-white text-indigo-600 hover:bg-gray-50 px-8 py-3 text-lg font-semibold"
          >
            Inizia ora – Registrati gratis
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">W</span>
                </div>
                <span className="text-xl font-bold text-white">Workover</span>
              </div>
              <p className="text-gray-400 max-w-md">
                La piattaforma che connette professionisti e spazi di lavoro flessibili 
                per un futuro del lavoro più dinamico e collaborativo.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Azienda</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Chi siamo</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carriere</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contatti</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Legale</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Termini di servizio</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Supporto</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Workover. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
