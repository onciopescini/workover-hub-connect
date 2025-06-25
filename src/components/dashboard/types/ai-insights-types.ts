
export interface AIInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'tip' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  confidence: number;
}

export interface MarketAnalysis {
  competitorPricing: {
    your_average: number;
    market_average: number;
    opportunity: string;
  };
  demandForecast: {
    next_week: string;
    next_month: string;
    seasonal_trend: string;
  };
  performance_score: number;
}

export type InsightCategory = 'all' | 'revenue' | 'bookings' | 'optimization';
