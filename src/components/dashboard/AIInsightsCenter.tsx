
import React, { useState } from 'react';
import { AIInsightsHeader } from './components/AIInsightsHeader';
import { AIInsightsCategoryFilters } from './components/AIInsightsCategoryFilters';
import { AIInsightCard } from './components/AIInsightCard';
import { AIInsightsQuickActions } from './components/AIInsightsQuickActions';
import { useAuth } from '@/hooks/auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import { generateAIInsights, generateMarketAnalysis } from '@/lib/ai/ai-insights-service';
import { filterInsightsByCategory } from './utils/ai-insights-filters';
import { InsightCategory } from './types/ai-insights-types';

export const AIInsightsCenter: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<InsightCategory>('all');
  const { authState } = useAuth();

  // Fetch real AI insights
  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ['ai-insights', authState.user?.id],
    queryFn: () => generateAIInsights(authState.user?.id || ''),
    enabled: !!authState.user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch market analysis
  const { data: marketAnalysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['market-analysis', authState.user?.id],
    queryFn: () => generateMarketAnalysis(authState.user?.id || ''),
    enabled: !!authState.user?.id,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const filteredInsights = filterInsightsByCategory(insights, selectedCategory);

  if (insightsLoading || analysisLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {marketAnalysis && <AIInsightsHeader marketAnalysis={marketAnalysis} />}

      <AIInsightsCategoryFilters 
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <div className="space-y-4">
        {filteredInsights.length > 0 ? (
          filteredInsights.map((insight) => (
            <AIInsightCard key={insight.id} insight={insight} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Nessun insight disponibile per questa categoria.</p>
            <p className="text-sm mt-2">Inizia a ricevere prenotazioni per generare analisi personalizzate.</p>
          </div>
        )}
      </div>

      <AIInsightsQuickActions />
    </div>
  );
};
