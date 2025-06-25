
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface FinancialMetricsInsightsProps {
  revenueGrowth: number;
  occupancyRate: number;
}

export const FinancialMetricsInsights: React.FC<FinancialMetricsInsightsProps> = ({
  revenueGrowth,
  occupancyRate
}) => {
  return (
    <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <AlertCircle className="w-5 h-5" />
          Insights e Opportunità
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-lg border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-2">📈 Trend Positivo</h4>
            <p className="text-sm text-purple-700">
              Revenue in crescita del {Math.abs(revenueGrowth).toFixed(1)}% rispetto al mese scorso.
              Continua con questa strategia!
            </p>
          </div>
          
          <div className="p-4 bg-white rounded-lg border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-2">🎯 Suggerimento</h4>
            <p className="text-sm text-purple-700">
              L'occupancy rate è al {occupancyRate.toFixed(1)}%. 
              Considera di ottimizzare i prezzi per aumentare la domanda.
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Visualizza Report Completo
          </Button>
          <Button variant="outline" size="sm">
            Imposta Nuovi Obiettivi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
