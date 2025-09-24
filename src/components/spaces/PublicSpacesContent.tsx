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
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
  
  // Enhanced error handling per la mappa
  const mapError = !mapCenter && "Impossibile determinare la posizione per la mappa";
  
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
          
          {mapError && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {mapError}
              </AlertDescription>
            </Alert>
          )}
        </div>
      }
      map={
        <div className="relative h-full">
          <SpaceMap 
            spaces={spaces || []} 
            userLocation={mapCenter}
            onSpaceClick={onMapSpaceClick}
            highlightedSpaceId={highlightedId}
          />
          
          {/* Overlay di caricamento per la mappa */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <LoadingSpinner />
            </div>
          )}
        </div>
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