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

      {/* Main Content Area - Dynamic sidebar adjustment */}
      <div className="ml-0 md:ml-0 lg:ml-[260px] transition-all duration-300">
        {/* Split Screen: Map + Cards with responsive ratios */}
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-48px)] max-h-[calc(100vh-48px)]">
          {/* Map Section - Dynamic width based on screen size */}
          <div className="
            w-full lg:w-[40%] xl:w-[45%]
            h-[400px] md:h-[500px] lg:h-full
            relative flex-shrink-0
          ">
            <div className="absolute inset-0 lg:min-h-[500px] xl:min-h-[600px]">
              {map}
            </div>
          </div>

          {/* Cards Section - Dynamic width, independent scroll with smooth behavior */}
          <div className="
            w-full lg:w-[60%] xl:w-[55%]
            h-auto lg:h-full
            overflow-y-auto scroll-smooth
          ">
            <div className="p-4 space-y-3">
              {cards}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
