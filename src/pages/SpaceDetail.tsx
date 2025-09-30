import React from 'react';
import { useParams } from 'react-router-dom';
import { SpaceDetailContent } from '@/components/spaces/SpaceDetailContent';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Space } from '@/types/space';
import { useSpaceReviews } from '@/hooks/queries/useSpaceReviews';
import { sreLogger } from '@/lib/sre-logger';

const SpaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  sreLogger.debug('SpaceDetail - ID from URL', { spaceId: id, component: 'SpaceDetail' });
  
  const { data: space, isLoading: spaceLoading, error: spaceError } = useQuery({
    queryKey: ['space', id],
    queryFn: async () => {
      if (!id) {
        sreLogger.error('No space ID provided', { component: 'SpaceDetail' }, new Error('Space ID not provided'));
        throw new Error('Space ID not provided');
      }
      
      sreLogger.debug('Fetching space with ID', { spaceId: id, component: 'SpaceDetail' });
      
      const { data, error } = await supabase.rpc('get_space_with_host_info', {
        space_id_param: id
      });

      if (error) {
        sreLogger.error('Database error', { spaceId: id, component: 'SpaceDetail' }, error as Error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        sreLogger.error('No space found for ID', { spaceId: id, component: 'SpaceDetail' }, new Error('Space not found'));
        throw new Error('Space not found');
      }
      
      const spaceData = Array.isArray(data) ? data[0] : data;
      
      if (!spaceData) {
        throw new Error('Space not found');
      }
      
      sreLogger.debug('Space fetched successfully', {
        spaceId: spaceData.id,
        title: (spaceData as any).title ?? (spaceData as any).name ?? 'Spazio',
        confirmation_type: spaceData.confirmation_type,
        published: (spaceData as any).published ?? true,
        component: 'SpaceDetail'
      });
      
      // Transform the response to match expected interface
      // Add title/name compatibility 
      const title = (spaceData as any).title ?? (spaceData as any).name ?? 'Spazio';
      
      return {
        ...spaceData,
        title, // Ensure title is always defined
        // Add missing fields to match Space type
        capacity: spaceData.max_capacity,
        approved_at: null,
        approved_by: null,
        deleted_at: null,
        host_id: 'hidden-for-security',
        is_suspended: false,
        rejection_reason: null,
        revision_notes: null,
        revision_requested: false,
        suspended_at: null,
        suspended_by: null,
        updated_at: spaceData.created_at,
        tags: [],
        space_type: null,
        city: null,
        country: null,
        images: spaceData.photos || [],
        pending_approval: false,
        space_creation_restricted: false,
        published: (spaceData as any).published ?? true,
        host: {
          id: 'host-id', // We don't expose the real host_id for security
          first_name: (spaceData as any).host_first_name ?? '',
          last_name: (spaceData as any).host_last_name ?? '',
          profile_photo_url: (spaceData as any).host_profile_photo ?? null,
          bio: (spaceData as any).host_bio ?? '',
          created_at: new Date().toISOString()
        },
        host_stripe_account_id: (spaceData as any).host_stripe_account_id ?? '',
        host_stripe_connected: (spaceData as any).host_stripe_connected ?? false
      } as unknown as Space & {
        host?: {
          id: string;
          first_name: string;
          last_name: string;
          profile_photo_url: string | null;
          bio?: string;
          created_at: string;
        };
      };
    },
    enabled: !!id
  });

  const { data: reviews = [] } = useSpaceReviews(id || '');

  // Loading state con debug info
  if (spaceLoading) {
    sreLogger.debug('Loading space', { spaceId: id, component: 'SpaceDetail' });
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Caricamento spazio...</p>
          {id && <p className="text-xs text-gray-400">ID: {id}</p>}
        </div>
      </div>
    );
  }

  // Error state con dettagli
  if (spaceError) {
    sreLogger.error('Error state', { spaceId: id, component: 'SpaceDetail' }, spaceError as Error);
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Errore nel caricamento</h1>
          <p className="text-gray-600 mb-4">
            {spaceError.message || 'Errore sconosciuto nel caricamento dello spazio'}
          </p>
          {id && (
            <div className="bg-gray-100 p-4 rounded-lg mt-4">
              <p className="text-sm text-gray-600">
                <strong>ID Spazio:</strong> {id}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong>Errore:</strong> {spaceError.message}
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
  sreLogger.debug('Rendering space details', { spaceId: space.id, component: 'SpaceDetail' });
  return (
    <div className="container mx-auto py-8">
      <SpaceDetailContent space={space} reviews={reviews} />
    </div>
  );
};

export default SpaceDetail;
