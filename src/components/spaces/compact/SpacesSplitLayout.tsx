import React from 'react';
import { cn } from '@/lib/utils';

interface SpacesSplitLayoutProps {
  searchBar: React.ReactNode;
  filtersPanel: React.ReactNode;
  map: React.ReactNode;
  cards: React.ReactNode;
}

export const SpacesSplitLayout: React.FC<SpacesSplitLayoutProps> = ({
  searchBar,
  filtersPanel,
  map,
  cards
}) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Search Bar - Always visible at top */}
      <div className="relative">
        {searchBar}
        {filtersPanel}
      </div>

      {/* Split Screen: Map + Cards FULLSCREEN */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-112px)]">
        {/* Map Section - Full size, optimized proportions */}
        <div className={cn(
          "w-full lg:w-[50%] xl:w-[55%]",
          "h-[400px] md:h-[500px] lg:h-full",
          "relative flex-shrink-0"
        )}>
          <div className="absolute inset-0">
            {map}
          </div>
        </div>

        {/* Cards Section - Independent scroll with smooth behavior */}
        <div className={cn(
          "w-full lg:w-[50%] xl:w-[45%]",
          "h-auto lg:h-full",
          "overflow-y-auto scroll-smooth"
        )}>
          <div className="p-4 space-y-3">
            {cards}
          </div>
        </div>
      </div>
    </div>
  );
};
