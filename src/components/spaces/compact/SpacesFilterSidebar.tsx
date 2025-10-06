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

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.category && filters.category !== 'all') count++;
    if (filters.amenities && filters.amenities.length > 0) count++;
    if (filters.workEnvironment && filters.workEnvironment !== 'all') count++;
    if (filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 100)) count++;
    if (filters.rating && filters.rating > 0) count++;
    if (filters.verified) count++;
    if (filters.superhost) count++;
    if (filters.instantBook) count++;
    return count;
  }, [filters]);

  return (
    <>
      {/* Sidebar - Optimized width and tablet behavior */}
      <div 
        className={cn(
          "fixed left-0 top-[48px] h-[calc(100vh-48px)] bg-background border-r border-border transition-all duration-300 z-40 overflow-y-auto",
          // Collapsed on tablet by default, reduced width to 260px
          isCollapsed ? "w-0 opacity-0" : "w-0 md:w-0 lg:w-[260px] opacity-0 lg:opacity-100"
        )}
      >
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              <h2 className="font-semibold text-base">Filtri</h2>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                  {activeFiltersCount}
                </span>
              )}
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

      {/* Toggle Button - Enhanced with badge for active filters */}
      {isCollapsed && (
        <Button
          variant="default"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="fixed left-0 top-[60px] z-40 rounded-l-none rounded-r-md shadow-lg relative"
        >
          <ChevronRight className="h-4 w-4 mr-1" />
          <SlidersHorizontal className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      )}
    </>
  );
};
