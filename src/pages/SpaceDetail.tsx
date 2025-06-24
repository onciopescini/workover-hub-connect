
import React from 'react';
import { useParams } from 'react-router-dom';
import { SpaceDetailContent } from '@/components/spaces/SpaceDetailContent';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Space } from '@/types/space';
import { Review } from '@/lib/review-utils';

const SpaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  const { data: space, isLoading: spaceLoading } = useQuery({
    queryKey: ['space', id],
    queryFn: async () => {
      if (!id) throw new Error('Space ID not provided');
      
      const { data, error } = await supabase
        .from('spaces')
        .select(`
          *,
          host:profiles!host_id (
            id,
            first_name,
            last_name,
            profile_photo_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Space & {
        host?: {
          id: string;
          first_name: string;
          last_name: string;
          profile_photo_url: string | null;
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
        .eq('booking_id', id); // This would need to be adjusted based on your review structure

      if (error) {
        console.error('Error fetching reviews:', error);
        return [];
      }
      
      return data as Review[];
    },
    enabled: !!id
  });

  if (spaceLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Spazio non trovato</h1>
          <p className="text-gray-600">Lo spazio che stai cercando non esiste o non è più disponibile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <SpaceDetailContent space={space} reviews={reviews} />
    </div>
  );
};

export default SpaceDetail;
