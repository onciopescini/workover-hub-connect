
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, CreditCard, Home, Users } from "lucide-react";

export function WelcomeMessage() {
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();

  if (!isVisible) return null;

  const handleStartSetup = () => {
    setIsVisible(false);
    // Scroll to the Stripe setup section
    const stripeSection = document.querySelector('[data-stripe-setup]');
    if (stripeSection) {
      stripeSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCreateSpace = () => {
    navigate('/spaces/new');
  };

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Benvenuto nella tua Dashboard Host!</CardTitle>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              Nuovo
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-700">
            Congratulazioni! Hai completato la registrazione come host. 
            Ora puoi iniziare a guadagnare condividendo i tuoi spazi con la community di coworker.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">1. Configura Pagamenti</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Collega il tuo account Stripe per ricevere pagamenti
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Home className="h-4 w-4 text-purple-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">2. Crea il tuo Spazio</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Pubblica il tuo primo spazio di coworking
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">3. Inizia a Guadagnare</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Ricevi prenotazioni e guadagna dalla community
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleStartSetup} className="flex-1">
              Inizia Setup
            </Button>
            <Button variant="outline" onClick={handleCreateSpace} className="flex-1">
              Crea Spazio
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
