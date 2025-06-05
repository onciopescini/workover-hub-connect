
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench, Home, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Maintenance = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wrench className="h-8 w-8 text-orange-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Manutenzione in Corso
          </h1>
          
          <p className="text-gray-600 mb-6">
            Stiamo migliorando la piattaforma per offrirti un'esperienza ancora migliore. 
            Torneremo presto!
          </p>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-center text-orange-700">
              <Clock className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                Tempo stimato: 2-3 ore
              </span>
            </div>
          </div>
          
          <Button 
            onClick={() => navigate('/')}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            <Home className="h-4 w-4 mr-2" />
            Torna alla Homepage
          </Button>
          
          <p className="text-xs text-gray-500 mt-6">
            Per aggiornamenti in tempo reale, seguici sui social media
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Maintenance;
