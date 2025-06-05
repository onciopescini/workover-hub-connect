
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Search, HelpCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 text-center">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-indigo-600 mb-4">404</h1>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Pagina Non Trovata
            </h2>
            <p className="text-gray-600 mb-2">
              La pagina che stai cercando non esiste o è stata spostata.
            </p>
            <p className="text-sm text-gray-500">
              URL richiesto: <code className="bg-gray-100 px-2 py-1 rounded">{location.pathname}</code>
            </p>
          </div>
          
          <div className="space-y-4">
            <Button 
              onClick={() => navigate('/')}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              <Home className="h-4 w-4 mr-2" />
              Torna alla Homepage
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline"
                onClick={handleGoBack}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Indietro
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/search')}
                className="w-full"
              >
                <Search className="h-4 w-4 mr-2" />
                Cerca
              </Button>
            </div>
            
            <Button 
              variant="outline"
              onClick={() => navigate('/help')}
              className="w-full"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Centro Assistenza
            </Button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Se pensi che questa sia un errore, 
              <button 
                onClick={() => navigate('/contact')}
                className="text-indigo-600 hover:text-indigo-800 ml-1 underline"
              >
                contattaci
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
