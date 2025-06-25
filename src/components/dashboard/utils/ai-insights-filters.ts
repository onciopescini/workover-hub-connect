
import { AIInsight, InsightCategory } from '../types/ai-insights-types';

export const filterInsightsByCategory = (insights: AIInsight[], category: InsightCategory): AIInsight[] => {
  if (category === 'all') return insights;
  
  return insights.filter(insight => {
    switch (category) {
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
};
