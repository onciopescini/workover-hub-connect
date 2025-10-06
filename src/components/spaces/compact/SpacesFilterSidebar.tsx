import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { AdvancedSpaceFilters } from '@/components/spaces/AdvancedSpaceFilters';
import { PublicSpacesHeader } from '@/components/spaces/PublicSpacesHeader';
import { SpaceFilters, FilterChangeHandler } from '@/types/space-filters';
import { cn } from '@/lib/utils';

interface SpacesFilterSidebarProps {
  filters: SpaceFilters;
  onFiltersChange: FilterChangeHandler;
  totalResults: number;
  defaultCollapsed?: boolean;
}

export const SpacesFilterSidebar: React.FC<SpacesFilterSidebarProps> = ({
  filters,
  onFiltersChange,
  totalResults,
  defaultCollapsed = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <>
      {/* Sidebar */}
      <div 
        className={cn(
          "fixed left-0 top-[48px] h-[calc(100vh-48px)] bg-background border-r border-border transition-all duration-300 z-40 overflow-y-auto",
          isCollapsed ? "w-0 opacity-0" : "w-[280px] opacity-100"
        )}
      >
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              <h2 className="font-semibold text-base">Filtri</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(true)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <PublicSpacesHeader spacesCount={totalResults} />
          
          <AdvancedSpaceFilters 
            filters={filters} 
            onFiltersChange={onFiltersChange}
            totalResults={totalResults}
          />
        </div>
      </div>

      {/* Toggle Button - Always visible when collapsed */}
      {isCollapsed && (
        <Button
          variant="default"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="fixed left-0 top-[60px] z-40 rounded-l-none rounded-r-md shadow-lg"
        >
          <ChevronRight className="h-4 w-4 mr-1" />
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      )}
    </>
  );
};
