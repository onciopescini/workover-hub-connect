
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldX, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldX className="h-8 w-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Accesso Non Autorizzato
          </h1>
          
          <p className="text-gray-600 mb-8">
            Non hai i permessi necessari per accedere a questa pagina. 
            Solo gli amministratori possono visualizzare questo contenuto.
          </p>
          
          <div className="space-y-4">
            <Button 
              onClick={() => navigate('/')}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              <Home className="h-4 w-4 mr-2" />
              Torna alla Homepage
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => navigate(-1)}
              className="w-full"
            >
              Torna Indietro
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;
