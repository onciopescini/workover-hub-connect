import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicSpacesContent } from '@/components/spaces/PublicSpacesContent';
import { usePublicSpacesLogic } from '@/hooks/usePublicSpacesLogic';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { BetaNotice } from '@/components/beta/BetaNotice';
import { useAuth } from '@/hooks/auth/useAuth';
import type { SpaceFilters } from '@/types/space-filters';

const CatalogHeaderStitch = lazy(() => import('@/feature/spaces/CatalogHeaderStitch'));

const Search = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { handleError } = useErrorHandler('Search');

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
    handleRadiusChange,
  } = usePublicSpacesLogic();

  const isStitch = import.meta.env.VITE_UI_THEME === 'stitch';

  const handleSpaceClick = (spaceId: string): void => {
    if (!spaceId || spaceId === 'undefined') {
      return;
    }

    handleCardClick(spaceId);
    navigate(`/spaces/${spaceId}`);
  };

  const handleMapSpaceClick = (spaceId: string): void => {
    handleMarkerClick(spaceId);
  };

  if (error) {
    handleError(error instanceof Error ? error : new Error(String(error)), {
      context: 'search_spaces_fetch',
      toastMessage: 'Errore nel caricamento degli spazi. Riprova più tardi.',
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
      <div className="container mx-auto px-4 pt-6 space-y-4">
        <BetaNotice />
        {!authState.isAuthenticated && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            Puoi esplorare liberamente tutti gli spazi. Effettua l'accesso solo quando vuoi prenotare.
          </div>
        )}
      </div>

      {isStitch && (
        <Suspense fallback={<div className="h-24 bg-stitch-surface border-b border-stitch-border" />}>
          <CatalogHeaderStitch />
        </Suspense>
      )}

      <PublicSpacesContent
        filters={filters}
        spaces={spaces ?? []}
        isLoading={isLoading}
        mapCenter={mapCenter}
        radiusKm={radiusKm}
        highlightedId={highlightedId}
        onFiltersChange={(nextFilters: SpaceFilters) => handleFiltersChange(nextFilters)}
        onRadiusChange={handleRadiusChange}
        onSpaceClick={handleSpaceClick}
        onMapSpaceClick={handleMapSpaceClick}
      />
    </div>
  );
};

export default Search;
