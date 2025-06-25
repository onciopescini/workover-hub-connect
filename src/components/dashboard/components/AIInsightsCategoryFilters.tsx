
import React from 'react';
import { Button } from '@/components/ui/button';
import { InsightCategory } from '../types/ai-insights-types';

interface AIInsightsCategoryFiltersProps {
  selectedCategory: InsightCategory;
  onCategoryChange: (category: InsightCategory) => void;
}

export const AIInsightsCategoryFilters: React.FC<AIInsightsCategoryFiltersProps> = ({
  selectedCategory,
  onCategoryChange
}) => {
  const categories: { key: InsightCategory; label: string }[] = [
    { key: 'all', label: 'Tutti' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'optimization', label: 'Optimization' }
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {categories.map((category) => (
        <Button
          key={category.key}
          variant={selectedCategory === category.key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange(category.key)}
        >
          {category.label}
        </Button>
      ))}
    </div>
  );
};
