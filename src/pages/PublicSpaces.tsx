
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicSpacesContent } from '@/components/spaces/PublicSpacesContent';
import { usePublicSpacesLogic } from '@/hooks/usePublicSpacesLogic';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { SpaceFilters } from '@/types/space-filters';

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
    highlightedId,
    handleCardClick,
    handleMarkerClick,
    handleFiltersChange
  } = usePublicSpacesLogic();

  const handleSpaceClick = (spaceId: string) => {
    if (!spaceId || spaceId === 'undefined') return;
    handleCardClick(spaceId);
    navigate(`/spaces/${spaceId}`);
  };

  const handleMapSpaceClick = (spaceId: string) => {
    handleMarkerClick(spaceId);
  };

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
    <div className="min-h-screen bg-background">
      <PublicSpacesContent
        filters={filters}
        spaces={spaces || []}
        isLoading={isLoading}
        mapCenter={mapCenter}
        highlightedId={highlightedId}
        onFiltersChange={(filters) => handleFiltersChange(filters as SpaceFilters)}
        onSpaceClick={handleSpaceClick}
        onMapSpaceClick={handleMapSpaceClick}
      />
    </div>
  );
};

export default PublicSpaces;
