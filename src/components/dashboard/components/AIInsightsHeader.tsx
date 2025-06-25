
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  DollarSign, 
  Users, 
  TrendingUp 
} from 'lucide-react';
import { MarketAnalysis } from '../types/ai-insights-types';

interface AIInsightsHeaderProps {
  marketAnalysis: MarketAnalysis;
}

export const AIInsightsHeader: React.FC<AIInsightsHeaderProps> = ({ marketAnalysis }) => {
  return (
    <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Brain className="w-6 h-6" />
          AI Insights Center
          <Badge className="bg-purple-100 text-purple-800 ml-auto">
            Performance Score: {marketAnalysis.performance_score}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border border-purple-200">
            <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="font-semibold text-gray-900">Pricing Opportunity</div>
            <div className="text-2xl font-bold text-green-600">{marketAnalysis.competitorPricing.opportunity}</div>
            <div className="text-sm text-gray-600">vs mercato</div>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg border border-purple-200">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="font-semibold text-gray-900">Domanda Prevista</div>
            <div className="text-2xl font-bold text-blue-600 capitalize">{marketAnalysis.demandForecast.next_week}</div>
            <div className="text-sm text-gray-600">prossima settimana</div>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg border border-purple-200">
            <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="font-semibold text-gray-900">Trend Stagionale</div>
            <div className="text-2xl font-bold text-purple-600 capitalize">{marketAnalysis.demandForecast.seasonal_trend}</div>
            <div className="text-sm text-gray-600">andamento</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
