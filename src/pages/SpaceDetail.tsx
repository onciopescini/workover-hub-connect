
import React from 'react';
import { useParams } from 'react-router-dom';
import { SpaceDetailContent } from '@/components/spaces/SpaceDetailContent';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Space } from '@/types/space';
import { Review } from '@/lib/review-utils';

const SpaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  // Debug logging per tracciare l'ID
  console.log('🔍 SpaceDetail - ID from URL:', id);
  
  const { data: space, isLoading: spaceLoading, error: spaceError } = useQuery({
    queryKey: ['space', id],
    queryFn: async () => {
      if (!id) {
        console.error('🔴 SpaceDetail - No space ID provided');
        throw new Error('Space ID not provided');
      }
      
      console.log('🔵 SpaceDetail - Fetching space with ID:', id);
      
      const { data, error } = await supabase
        .from('spaces')
        .select(`
          *,
          host:profiles!spaces_host_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url,
            bio,
            location,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('🔴 SpaceDetail - Database error:', error);
        throw error;
      }
      
      if (!data) {
        console.error('🔴 SpaceDetail - No space found for ID:', id);
        throw new Error('Space not found');
      }
      
      console.log('✅ SpaceDetail - Space fetched successfully:', {
        id: data.id,
        title: data.title,
        confirmation_type: data.confirmation_type,
        published: data.published,
        is_suspended: data.is_suspended
      });
      
      return data as Space & {
        host?: {
          id: string;
          first_name: string;
          last_name: string;
          profile_photo_url: string | null;
          bio?: string;
          location?: string;
          created_at: string;
        };
      };
    },
    enabled: !!id
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['space-reviews', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('booking_id', id);

      if (error) {
        console.error('Error fetching reviews:', error);
        return [];
      }
      
      return data as Review[];
    },
    enabled: !!id
  });

  // Loading state con debug info
  if (spaceLoading) {
    console.log('🔄 SpaceDetail - Loading space...');
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
    console.error('🔴 SpaceDetail - Error state:', spaceError);
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
    console.warn('⚠️ SpaceDetail - Space not found');
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
  console.log('✅ SpaceDetail - Rendering space details');
  return (
    <div className="container mx-auto py-8">
      <SpaceDetailContent space={space} reviews={reviews} />
    </div>
  );
};

export default SpaceDetail;
