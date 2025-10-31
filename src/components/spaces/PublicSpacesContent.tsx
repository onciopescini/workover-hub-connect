/**
 * Public Spaces Content Component - New Horizontal Layout
 * 
 * Features:
 * - Horizontal search bar with location, date picker, and filters
 * - Expandable filters panel from top
 * - Full-screen split: Map (50-55%) + Cards (45-50%)
 * - No lateral sidebar
 */
import React, { useState, lazy, Suspense } from 'react';
import { LazySpaceMap, usePreloadOnHover } from '@/components/optimization/LazyComponents';
import { CompactSpaceCardsGrid } from '@/components/spaces/compact/CompactSpaceCardsGrid';
import { SpacesSplitLayout } from '@/components/spaces/compact/SpacesSplitLayout';
import { CompactSearchBar } from '@/components/spaces/search/CompactSearchBar';
import { ExpandableFiltersPanel } from '@/components/spaces/search/ExpandableFiltersPanel';
import { Space, SpaceFilters, FilterChangeHandler, SpaceClickHandler, Coordinates } from '@/types/space-filters';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const CatalogFiltersStitch = lazy(() => import('@/feature/spaces/CatalogFiltersStitch'));

interface PublicSpacesContentProps {
  filters: SpaceFilters;
  spaces: any[];
  isLoading: boolean;
  mapCenter: Coordinates | null;
  radiusKm: number;
  highlightedId: string | null;
  onFiltersChange: FilterChangeHandler;
  onRadiusChange: (newRadius: number) => void;
  onSpaceClick: SpaceClickHandler;
  onMapSpaceClick: SpaceClickHandler;
}

export const PublicSpacesContent = ({
  filters,
  spaces,
  isLoading,
  mapCenter,
  radiusKm,
  highlightedId,
  onFiltersChange,
  onRadiusChange,
  onSpaceClick,
  onMapSpaceClick
}: PublicSpacesContentProps) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const isStitch = import.meta.env.VITE_UI_THEME === 'stitch';
  
  // Preload SpaceMap on hover for better UX
  const preloadMapProps = usePreloadOnHover(() => import('@/components/spaces/SpaceMap'));

  const handleLocationChange = (location: string, coordinates?: Coordinates) => {
    onFiltersChange({
      ...filters,
      location,
      coordinates: coordinates || null
    });
  };

  const handleToggleFilters = () => {
    setIsFiltersOpen(!isFiltersOpen);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.amenities.length > 0) count++;
    if (filters.workEnvironment) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 200) count++;
    if (filters.rating > 0) count++;
    if (filters.verified) count++;
    if (filters.superhost) count++;
    if (filters.instantBook) count++;
    if (filters.startDate || filters.endDate) count++;
    return count;
  };

  const handleStartDateChange = (date: Date | null) => {
    onFiltersChange({
      ...filters,
      startDate: date
    });
  };

  const handleEndDateChange = (date: Date | null) => {
    onFiltersChange({
      ...filters,
      endDate: date
    });
  };

  const handleNearMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          onFiltersChange({
            ...filters,
            location: 'La tua posizione',
            coordinates
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const handleTopRated = () => {
    onFiltersChange({
      ...filters,
      rating: 4.5
    });
  };

  const handleAvailableNow = () => {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    onFiltersChange({
      ...filters,
      startDate: now,
      endDate: twoHoursLater
    });
  };

  const handleStartTimeChange = (time: string | null) => {
    onFiltersChange({
      ...filters,
      startTime: time
    });
  };

  const handleEndTimeChange = (time: string | null) => {
    onFiltersChange({
      ...filters,
      endTime: time
    });
  };

  const searchBar = (
    <CompactSearchBar
      location={filters.location}
      coordinates={filters.coordinates}
      radiusKm={radiusKm}
      startDate={filters.startDate}
      endDate={filters.endDate}
      startTime={filters.startTime}
      endTime={filters.endTime}
      activeFiltersCount={getActiveFiltersCount()}
      isFiltersOpen={isFiltersOpen}
      onLocationChange={handleLocationChange}
      onRadiusChange={onRadiusChange}
      onStartDateChange={handleStartDateChange}
      onEndDateChange={handleEndDateChange}
      onStartTimeChange={handleStartTimeChange}
      onEndTimeChange={handleEndTimeChange}
      onToggleFilters={handleToggleFilters}
      onNearMe={handleNearMe}
      onTopRated={handleTopRated}
      onAvailableNow={handleAvailableNow}
    />
  );

  return (
    <SpacesSplitLayout
      searchBar={
        isStitch ? (
          <Suspense fallback={<div className="h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)]" />}>
            <CatalogFiltersStitch>
              {searchBar}
            </CatalogFiltersStitch>
          </Suspense>
        ) : (
          searchBar
        )
      }
      filtersPanel={
        <ExpandableFiltersPanel
          isOpen={isFiltersOpen}
          filters={filters}
          onFiltersChange={onFiltersChange}
          totalResults={spaces?.length || 0}
        />
      }
      map={
        <div className="relative h-[500px] lg:h-[calc(100vh-112px)] w-full" {...preloadMapProps}>
          <LazySpaceMap 
            spaces={spaces || []} 
            userLocation={mapCenter}
            searchCenter={filters.coordinates}
            searchRadiusKm={radiusKm}
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
            selectedDate={filters.startDate}
          />
      }
    />
  );
};