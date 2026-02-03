import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, MapPin } from 'lucide-react';
import { SpaceCard } from '@/components/spaces/SpaceCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth/useAuth';
import { getFavoriteSpaces, FavoriteSpace } from '@/lib/favorites-utils';
import { Space } from '@/types/space';

const Favorites: React.FC = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const userId = authState.user?.id;

  const { data: favorites = [], isLoading, error, refetch } = useQuery({
    queryKey: ['favorites', userId],
    queryFn: async () => {
      if (!userId) return [];
      return getFavoriteSpaces(userId);
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  // Map FavoriteSpace to partial Space for SpaceCard
  const mapFavoriteToSpace = (favorite: FavoriteSpace): Space | null => {
    if (!favorite.space) return null;
    
    // Create a minimal Space object with required fields for SpaceCard
    const spaceData: Partial<Space> & { id: string } = {
      id: favorite.space.id,
      title: favorite.space.title,
      name: favorite.space.title,
      description: favorite.space.description,
      address: favorite.space.address,
      price_per_day: favorite.space.price_per_day,
      price_per_hour: 0,
      max_capacity: 1,
      photos: favorite.space.photos,
      category: (favorite.space.category || 'home') as 'home' | 'outdoor' | 'professional',
      // Map work_environment to the database enum values
      work_environment: 'controlled' as 'controlled' | 'dynamic' | 'silent',
      host_id: favorite.space.host_id,
      amenities: [],
      features: [],
      seating_types: [],
      created_at: '',
      updated_at: '',
      published: true,
      // Provide null values for required nullable fields
      approved_at: null,
      approved_by: null,
      approximate_location: null,
      availability: null,
      cached_avg_rating: null,
      cached_review_count: null,
      city_name: null,
      confirmation_type: 'host_approval' as const,
      deleted_at: null,
      latitude: null,
      longitude: null,
      pending_approval: null,
      rejection_reason: null,
      revision_notes: null,
      revision_requested: null,
    };
    
    return spaceData as Space;
  };

  const validSpaces = favorites
    .map(mapFavoriteToSpace)
    .filter((space): space is Space => space !== null);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">I miei Preferiti</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-red-500 mb-2">Errore nel caricamento dei preferiti.</div>
          <Button onClick={() => refetch()} variant="outline">Riprova</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Heart className="h-8 w-8 text-red-500 fill-current" />
          I miei Preferiti
        </h1>
        <p className="text-gray-600 text-lg">
          Gli spazi che hai salvato per dopo
        </p>
      </div>

      {validSpaces.length > 0 ? (
        <>
          <p className="text-gray-600 mb-6 font-medium">
            {validSpaces.length} {validSpaces.length === 1 ? 'spazio salvato' : 'spazi salvati'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {validSpaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                onClick={() => navigate(`/space/${space.id}`)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nessun preferito salvato
          </h3>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            Esplora gli spazi disponibili e salva i tuoi preferiti 
            cliccando sul cuore per ritrovarli qui.
          </p>
          <Button onClick={() => navigate('/search')} className="bg-primary hover:bg-primary/90">
            <MapPin className="h-4 w-4 mr-2" />
            Esplora spazi
          </Button>
        </div>
      )}
    </div>
  );
};

export default Favorites;
