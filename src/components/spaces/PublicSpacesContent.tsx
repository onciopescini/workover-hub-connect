/**
 * Public Spaces Content Component - Optimized Compact Layout
 * 
 * Features:
 * - Collapsible filter sidebar (280px)
 * - Split-screen: Map (40%) + Cards (60%)
 * - Compact horizontal cards (110px height)
 * - Independent scrolling for cards section
 */
import { SpaceMap } from '@/components/spaces/SpaceMap';
import { CompactSpaceCardsGrid } from '@/components/spaces/compact/CompactSpaceCardsGrid';
import { SpacesSplitLayout } from '@/components/spaces/compact/SpacesSplitLayout';
import { Space, SpaceFilters, FilterChangeHandler, SpaceClickHandler, Coordinates } from '@/types/space-filters';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface PublicSpacesContentProps {
  filters: SpaceFilters;
  spaces: any[];
  isLoading: boolean;
  mapCenter: Coordinates | null;
  highlightedId: string | null;
  onFiltersChange: FilterChangeHandler;
  onSpaceClick: SpaceClickHandler;
  onMapSpaceClick: SpaceClickHandler;
}

export const PublicSpacesContent = ({
  filters,
  spaces,
  isLoading,
  mapCenter,
  highlightedId,
  onFiltersChange,
  onSpaceClick,
  onMapSpaceClick
}: PublicSpacesContentProps) => {
  
  return (
    <SpacesSplitLayout
      filters={filters}
      onFiltersChange={onFiltersChange}
      totalResults={spaces?.length || 0}
      map={
        <div className="relative h-full w-full">
          <SpaceMap 
            spaces={spaces || []} 
            userLocation={mapCenter}
            onSpaceClick={onMapSpaceClick}
            highlightedSpaceId={highlightedId}
          />
          
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <LoadingSpinner />
            </div>
          )}
        </div>
      }
      cards={
        <CompactSpaceCardsGrid 
          spaces={spaces || []} 
          onSpaceClick={onSpaceClick}
          highlightedId={highlightedId}
          isLoading={isLoading}
        />
      }
      sidebarDefaultCollapsed={false}
    />
  );
};