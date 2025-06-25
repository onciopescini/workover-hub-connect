
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, DollarSign, Calendar } from 'lucide-react';

export const AIInsightsQuickActions: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Azioni Rapide AI
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button className="h-auto p-4 flex flex-col items-start text-left">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="font-medium">Ottimizza Prezzi</span>
            </div>
            <span className="text-sm text-gray-600">
              Applica pricing dinamico basato su domanda e concorrenza
            </span>
          </Button>
          
          <Button variant="outline" className="h-auto p-4 flex flex-col items-start text-left">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Previsioni Avanzate</span>
            </div>
            <span className="text-sm text-gray-600">
              Analisi predittiva per i prossimi 3 mesi
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
