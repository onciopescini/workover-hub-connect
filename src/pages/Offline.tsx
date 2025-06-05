
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WifiOff, RotateCcw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Offline = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <WifiOff className="h-8 w-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Connessione Assente
          </h1>
          
          <p className="text-gray-600 mb-8">
            Non riusciamo a connetterci a Internet. Controlla la tua connessione 
            e riprova.
          </p>
          
          <div className="space-y-4">
            <Button 
              onClick={handleRetry}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Riprova
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Torna alla Homepage
            </Button>
          </div>
          
          <div className="mt-8 text-xs text-gray-500">
            <p>Suggerimenti:</p>
            <ul className="list-disc text-left inline-block mt-2 space-y-1">
              <li>Verifica la connessione Wi-Fi</li>
              <li>Controlla i dati mobili</li>
              <li>Riavvia il router se necessario</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Offline;
