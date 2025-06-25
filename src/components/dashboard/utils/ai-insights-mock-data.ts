
import { AIInsight, MarketAnalysis } from '../types/ai-insights-types';

export const getMockInsights = (): AIInsight[] => [
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

export const getMockMarketAnalysis = (): MarketAnalysis => ({
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
});
