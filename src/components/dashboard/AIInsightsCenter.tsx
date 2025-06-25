
import React, { useState } from 'react';
import { AIInsightsHeader } from './components/AIInsightsHeader';
import { AIInsightsCategoryFilters } from './components/AIInsightsCategoryFilters';
import { AIInsightCard } from './components/AIInsightCard';
import { AIInsightsQuickActions } from './components/AIInsightsQuickActions';
import { getMockInsights, getMockMarketAnalysis } from './utils/ai-insights-mock-data';
import { filterInsightsByCategory } from './utils/ai-insights-filters';
import { InsightCategory } from './types/ai-insights-types';

export const AIInsightsCenter: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<InsightCategory>('all');

  const insights = getMockInsights();
  const marketAnalysis = getMockMarketAnalysis();
  const filteredInsights = filterInsightsByCategory(insights, selectedCategory);

  return (
    <div className="space-y-6">
      <AIInsightsHeader marketAnalysis={marketAnalysis} />

      <AIInsightsCategoryFilters 
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <div className="space-y-4">
        {filteredInsights.map((insight) => (
          <AIInsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      <AIInsightsQuickActions />
    </div>
  );
};
