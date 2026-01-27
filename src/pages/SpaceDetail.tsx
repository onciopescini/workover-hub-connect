import React, { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { SpaceDetailContent } from '@/components/spaces/SpaceDetailContent';
import { sreLogger } from '@/lib/sre-logger';
import { useSpaceDetail } from '@/hooks/useSpaceDetail';
import { SpaceDetailSkeleton } from '@/components/spaces/SpaceDetailSkeleton';

const SpaceHeroStitch = lazy(() => import('@/feature/spaces/SpaceHeroStitch'));

const SpaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const isStitch = import.meta.env.VITE_UI_THEME === 'stitch';
  
  sreLogger.debug('SpaceDetail - ID from URL', { spaceId: id, component: 'SpaceDetail' });
  
  const { space, isLoading, error, reviews, cachedRating } = useSpaceDetail(id);

  // Loading state
  if (isLoading) {
    sreLogger.debug('Loading space', { spaceId: id, component: 'SpaceDetail' });
    return (
      <div className={`container mx-auto ${isStitch ? 'bg-stitch-bg' : ''}`}>
        <SpaceDetailSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    sreLogger.error('Error state', { spaceId: id, component: 'SpaceDetail' }, error as Error);
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Errore nel caricamento</h1>
          <p className="text-gray-600 mb-4">
            {error.message || 'Errore sconosciuto nel caricamento dello spazio'}
          </p>
          {id && (
            <div className="bg-gray-100 p-4 rounded-lg mt-4">
              <p className="text-sm text-gray-600">
                <strong>ID Spazio:</strong> {id}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong>Errore:</strong> {error.message}
              </p>
            </div>
          )}
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // Space not found
  if (!space) {
    sreLogger.warn('Space not found', { spaceId: id, component: 'SpaceDetail' });
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Spazio non trovato</h1>
          <p className="text-gray-600 mb-4">
            Lo spazio che stai cercando non esiste o non è più disponibile.
          </p>
          {id && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>ID ricercato:</strong> {id}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Success - render space details
  // AGGRESSIVE FIX: Cast space to any to bypass strict type checking
  sreLogger.debug('Rendering space details', { 
    spaceId: space?.id,
    hasPreLocation: !!(space as unknown as Record<string, unknown>)['hasPreciseLocation'],
    component: 'SpaceDetail' 
  });
  
  // AGGRESSIVE FIX: Ensure reviews is always an array
  const safeReviews = reviews ?? [];
  
  return (
    <div className={`container mx-auto py-8 ${isStitch ? 'bg-stitch-bg' : ''}`}>
      {isStitch ? (
        <Suspense fallback={<div className="min-h-[400px] bg-stitch-bg" />}>
          <SpaceHeroStitch>
            <SpaceDetailContent 
              space={space!}
              reviews={safeReviews as any}
              weightedRating={cachedRating}
            />
          </SpaceHeroStitch>
        </Suspense>
      ) : (
        <SpaceDetailContent 
          space={space!}
          reviews={safeReviews as any}
          weightedRating={cachedRating}
        />
      )}
    </div>
  );
};

export default SpaceDetail;
