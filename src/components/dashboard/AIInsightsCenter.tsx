
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Lightbulb, 
  AlertTriangle,
  CheckCircle,
  Zap,
  DollarSign,
  Users,
  Calendar,
  BarChart3
} from 'lucide-react';

interface AIInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'tip' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  confidence: number;
}

export const AIInsightsCenter: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'revenue' | 'bookings' | 'optimization'>('all');

  const insights: AIInsight[] = [
    {
      id: '1',
      type: 'opportunity',
      title: 'Opportunità Pricing Dinamico',
      description: 'I tuoi competitor hanno aumentato i prezzi del 15% per le sale riunioni. Potresti incrementare i ricavi di €1.200/mese.',
      impact: 'high',
      actionable: true,
      confidence: 87
    },
    {
      id: '2',
      type: 'trend',
      title: 'Trend Positive: Prenotazioni +23%',
      description: 'Le prenotazioni sono aumentate del 23% rispetto al mese scorso. Il picco è tra le 14:00-16:00.',
      impact: 'high',
      actionable: false,
      confidence: 95
    },
    {
      id: '3',
      type: 'warning',
      title: 'Cancellazioni in Aumento',
      description: 'Le cancellazioni last-minute sono aumentate del 12%. Considera una politica di cancellazione più stringente.',
      impact: 'medium',
      actionable: true,
      confidence: 78
    },
    {
      id: '4',
      type: 'tip',
      title: 'Ottimizza Orari di Apertura',
      description: 'Il 34% delle richieste arriva dopo le 18:00. Considera di estendere gli orari per catturare più prenotazioni.',
      impact: 'medium',
      actionable: true,
      confidence: 82
    }
  ];

  const marketAnalysis = {
    competitorPricing: {
      your_average: 85,
      market_average: 92,
      opportunity: '+8.2%'
    },
    demandForecast: {
      next_week: 'high',
      next_month: 'medium',
      seasonal_trend: 'growing'
    },
    performance_score: 78
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'tip':
        return <Lightbulb className="w-5 h-5 text-blue-600" />;
      case 'trend':
        return <BarChart3 className="w-5 h-5 text-purple-600" />;
      default:
        return <Brain className="w-5 h-5 text-gray-600" />;
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">Alto Impatto</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medio Impatto</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Basso Impatto</Badge>;
      default:
        return <Badge variant="secondary">{impact}</Badge>;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredInsights = selectedCategory === 'all' 
    ? insights 
    : insights.filter(insight => {
        switch (selectedCategory) {
          case 'revenue':
            return insight.type === 'opportunity' && insight.title.toLowerCase().includes('pricing');
          case 'bookings':
            return insight.title.toLowerCase().includes('prenotazioni') || insight.title.toLowerCase().includes('cancellazioni');
          case 'optimization':
            return insight.type === 'tip' || insight.type === 'warning';
          default:
            return true;
        }
      });

  return (
    <div className="space-y-6">
      {/* Header with Performance Score */}
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

      {/* Category Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'revenue', 'bookings', 'optimization'].map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category as any)}
            className="capitalize"
          >
            {category === 'all' ? 'Tutti' : category}
          </Button>
        ))}
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {filteredInsights.map((insight) => (
          <Card key={insight.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getInsightIcon(insight.type)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getImpactBadge(insight.impact)}
                      <span className={`text-sm font-medium ${getConfidenceColor(insight.confidence)}`}>
                        {insight.confidence}% sicurezza
                      </span>
                    </div>
                  </div>
                </div>
                {insight.actionable && (
                  <Zap className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              
              <p className="text-gray-700 mb-4">{insight.description}</p>
              
              <div className="flex items-center justify-between">
                <Progress value={insight.confidence} className="w-32 h-2" />
                {insight.actionable && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Dettagli
                    </Button>
                    <Button size="sm">
                      Applica Suggerimento
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
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
    </div>
  );
};
