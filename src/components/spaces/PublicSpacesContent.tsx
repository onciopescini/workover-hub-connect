/**
 * Public Spaces Content Component
 * 
 * Extracted from PublicSpaces.tsx - handles main layout with map and cards
 */
import { SpaceMap } from '@/components/spaces/SpaceMap';
import { EnhancedSpaceCardsGrid } from '@/components/spaces/EnhancedSpaceCardsGrid';
import { SplitScreenLayout } from '@/components/shared/SplitScreenLayout';
import { AdvancedSpaceFilters } from '@/components/spaces/AdvancedSpaceFilters';
import { PublicSpacesHeader } from './PublicSpacesHeader';
import { Space, SpaceFilters, FilterChangeHandler, SpaceClickHandler, Coordinates } from '@/types/space-filters';

interface PublicSpacesContentProps {
  filters: SpaceFilters;
  spaces: any[]; // Keep as any[] for compatibility with existing components
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
    <SplitScreenLayout
      filters={
        <div className="space-y-6">
          <PublicSpacesHeader spacesCount={spaces?.length} />
          <AdvancedSpaceFilters 
            filters={filters} 
            onFiltersChange={onFiltersChange}
            totalResults={spaces?.length || 0}
          />
        </div>
      }
      map={
        <SpaceMap 
          spaces={spaces || []} 
          userLocation={mapCenter}
          onSpaceClick={onMapSpaceClick}
          highlightedSpaceId={highlightedId}
        />
      }
      cards={
        <EnhancedSpaceCardsGrid 
          spaces={spaces || []} 
          onSpaceClick={onSpaceClick}
          highlightedId={highlightedId}
          isLoading={isLoading}
        />
      }
    />
  );
};