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

interface PublicSpacesContentProps {
  filters: any;
  spaces: any[];
  isLoading: boolean;
  mapCenter: { lat: number; lng: number } | null;
  highlightedId: string | null;
  onFiltersChange: (filters: any) => void;
  onSpaceClick: (spaceId: string) => void;
  onMapSpaceClick: (spaceId: string) => void;
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