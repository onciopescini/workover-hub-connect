import React from 'react';
import { AdvancedSpaceFilters } from '@/components/spaces/AdvancedSpaceFilters';
import { SpaceFilters, FilterChangeHandler } from '@/types/space-filters';
import { cn } from '@/lib/utils';

interface ExpandableFiltersPanelProps {
  isOpen: boolean;
  filters: SpaceFilters;
  onFiltersChange: FilterChangeHandler;
  totalResults: number;
}

export const ExpandableFiltersPanel: React.FC<ExpandableFiltersPanelProps> = ({
  isOpen,
  filters,
  onFiltersChange,
  totalResults
}) => {
  return (
    <div
      className={cn(
        "absolute top-full left-0 right-0 z-20 bg-background shadow-lg border-b transition-all duration-300 overflow-hidden",
        isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
      )}
    >
      <div className="p-4">
        <AdvancedSpaceFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          totalResults={totalResults}
        />
      </div>
    </div>
  );
};
