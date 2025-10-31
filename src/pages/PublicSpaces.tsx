
import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicSpacesContent } from '@/components/spaces/PublicSpacesContent';
import { usePublicSpacesLogic } from '@/hooks/usePublicSpacesLogic';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { SpaceFilters } from '@/types/space-filters';
import { BetaNotice } from '@/components/beta/BetaNotice';

const CatalogHeaderStitch = lazy(() => import('@/feature/spaces/CatalogHeaderStitch'));

/**
 * Public Spaces Page - Refactored for better maintainability
 * 
 * Now uses custom hooks for business logic and specialized components
 * for UI rendering. Reduced from 198 lines to under 80 lines.
 */
const PublicSpaces = () => {
  const navigate = useNavigate();
  const { handleError } = useErrorHandler('PublicSpaces');
  
  const {
    filters,
    spaces,
    isLoading,
    error,
    mapCenter,
    radiusKm,
    highlightedId,
    handleCardClick,
    handleMarkerClick,
    handleFiltersChange,
    handleRadiusChange
  } = usePublicSpacesLogic();

  const handleSpaceClick = (spaceId: string) => {
    if (!spaceId || spaceId === 'undefined') return;
    handleCardClick(spaceId);
    navigate(`/spaces/${spaceId}`);
  };

  const handleMapSpaceClick = (spaceId: string) => {
    handleMarkerClick(spaceId);
  };

  const isStitch = import.meta.env['VITE_UI_THEME'] === 'stitch';

  // Handle errors with proper user feedback
  if (error) {
    handleError(error, { 
      context: 'spaces_fetch',
      toastMessage: 'Errore nel caricamento degli spazi. Riprova più tardi.'
    });
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Errore nel caricamento</h2>
          <p className="text-muted-foreground">Si è verificato un errore durante il caricamento degli spazi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isStitch ? 'bg-stitch-bg' : 'bg-background'}`}>
      <div className="container mx-auto px-4 pt-6">
        <BetaNotice />
      </div>

      {isStitch && (
        <Suspense fallback={<div className="h-24 bg-stitch-surface border-b border-stitch-border" />}>
          <CatalogHeaderStitch />
        </Suspense>
      )}

      <PublicSpacesContent
        filters={filters}
        spaces={spaces || []}
        isLoading={isLoading}
        mapCenter={mapCenter}
        radiusKm={radiusKm}
        highlightedId={highlightedId}
        onFiltersChange={(filters) => handleFiltersChange(filters as SpaceFilters)}
        onRadiusChange={handleRadiusChange}
        onSpaceClick={handleSpaceClick}
        onMapSpaceClick={handleMapSpaceClick}
      />
    </div>
  );
};

export default PublicSpaces;
