import React from 'react';
import { SpacesFilterSidebar } from './SpacesFilterSidebar';
import { SpaceFilters, FilterChangeHandler } from '@/types/space-filters';
import { cn } from '@/lib/utils';

interface SpacesSplitLayoutProps {
  filters: SpaceFilters;
  onFiltersChange: FilterChangeHandler;
  totalResults: number;
  map: React.ReactNode;
  cards: React.ReactNode;
  sidebarDefaultCollapsed?: boolean;
}

export const SpacesSplitLayout: React.FC<SpacesSplitLayoutProps> = ({
  filters,
  onFiltersChange,
  totalResults,
  map,
  cards,
  sidebarDefaultCollapsed = false
}) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Filter Sidebar */}
      <SpacesFilterSidebar 
        filters={filters}
        onFiltersChange={onFiltersChange}
        totalResults={totalResults}
        defaultCollapsed={sidebarDefaultCollapsed}
      />

      {/* Main Content Area - Adjusted for sidebar */}
      <div className="ml-0 lg:ml-[280px] transition-all duration-300">
        {/* Split Screen: Map + Cards */}
        <div className="flex flex-col lg:flex-row h-[calc(100vh-48px)]">
          {/* Map Section - 40% width on desktop */}
          <div className="lg:w-[40%] h-[300px] lg:h-full relative flex-shrink-0">
            <div className="absolute inset-0">
              {map}
            </div>
          </div>

          {/* Cards Section - 60% width on desktop, independent scroll */}
          <div className="lg:w-[60%] h-full overflow-y-auto">
            <div className="p-4 space-y-3">
              {cards}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
