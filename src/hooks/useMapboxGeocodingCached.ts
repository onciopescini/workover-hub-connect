import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sreLogger } from '@/lib/sre-logger';
import { useMapboxToken } from '@/contexts/MapboxTokenContext';

interface GeocodeResult {
  place_name: string;
  center: [number, number]; // [lng, lat]
  bbox?: [number, number, number, number];
}

export const useMapboxGeocodingCached = () => {
  const { token: mapboxToken } = useMapboxToken();
  const [error, setError] = useState<string | null>(null);

  const geocodeAddress = async (query: string): Promise<GeocodeResult[]> => {
    if (!query.trim() || query.length < 3) return [];
    
    setError(null);
    
    try {
      if (!mapboxToken) {
        throw new Error('Token Mapbox non disponibile');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&types=place,locality,address&country=IT&language=it&limit=5`
      );
      
      if (!response.ok) {
        throw new Error('Errore nella ricerca della località');
      }
      
      const data = await response.json();
      
      return data.features.map((feature: { place_name: string; center: [number, number]; bbox?: [number, number, number, number] }) => ({
        place_name: feature.place_name,
        center: feature.center,
        bbox: feature.bbox
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nella geocodifica';
      setError(errorMessage);
      sreLogger.error('Geocoding error', {}, err as Error);
      return [];
    }
  };

  const reverseGeocode = async (lng: number, lat: number): Promise<string> => {
    setError(null);
    
    try {
      if (!mapboxToken) {
        throw new Error('Token Mapbox non disponibile');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=place,locality&language=it&limit=1`
      );
      
      if (!response.ok) {
        throw new Error('Errore nella ricerca della posizione');
      }
      
      const data = await response.json();
      return data.features[0]?.place_name || 'Posizione sconosciuta';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nel reverse geocoding';
      setError(errorMessage);
      sreLogger.error('Reverse geocoding error', {}, err as Error);
      return 'Posizione sconosciuta';
    }
  };

  return {
    geocodeAddress,
    reverseGeocode,
    isLoading: false, // We handle loading in the query
    error
  };
};

// Hook with React Query caching
export const useGeocodingQuery = (query: string) => {
  const { token: mapboxToken } = useMapboxToken();

  return useQuery<GeocodeResult[]>({
    queryKey: ['geocode', query],
    queryFn: async () => {
      if (!query.trim() || query.length < 3) return [];
      
      if (!mapboxToken) {
        throw new Error('Token Mapbox non disponibile');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&types=place,locality,address&country=IT&language=it&limit=5`
      );
      
      if (!response.ok) {
        throw new Error('Errore nella ricerca della località');
      }
      
      const data = await response.json();
      
      return data.features.map((feature: { place_name: string; center: [number, number]; bbox?: [number, number, number, number] }) => ({
        place_name: feature.place_name,
        center: feature.center,
        bbox: feature.bbox
      }));
    },
    enabled: query.length >= 3 && !!mapboxToken,
    staleTime: 5 * 60 * 1000, // 5 minuti - i risultati rimangono freschi
    gcTime: 30 * 60 * 1000, // 30 minuti - cache time (era cacheTime in v4)
    retry: 2,
    retryDelay: 1000,
  });
};
