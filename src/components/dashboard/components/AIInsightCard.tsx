
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  BarChart3,
  Brain,
  Zap
} from 'lucide-react';
import { AIInsight } from '../types/ai-insights-types';

interface AIInsightCardProps {
  insight: AIInsight;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({ insight }) => {
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

  return (
    <Card className="hover:shadow-md transition-shadow">
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
  );
};
