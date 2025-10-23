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
    
    const startTime = performance.now();
    sreLogger.info('Geocoding request started', { 
      query,
      queryLength: query.length 
    });
    
    try {
      if (!mapboxToken) {
        throw new Error('Token Mapbox non disponibile');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&types=place,locality,address&country=IT&language=it&limit=5`
      );
      
      if (!response.ok) {
        sreLogger.error('Geocoding request failed', { 
          query,
          status: response.status 
        });
        throw new Error('Errore nella ricerca della località');
      }
      
      const data = await response.json();
      const results = data.features.map((feature: { place_name: string; center: [number, number]; bbox?: [number, number, number, number] }) => ({
        place_name: feature.place_name,
        center: feature.center,
        bbox: feature.bbox
      }));

      const duration = performance.now() - startTime;
      sreLogger.logMetric('geocoding_api_duration', duration, 'ms', {
        query_length: query.length.toString(),
        results_count: results.length.toString()
      });

      if (duration > 1000) {
        sreLogger.warn('Slow geocoding detected', {
          query,
          duration,
          resultsCount: results.length
        });
      }

      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nella geocodifica';
      setError(errorMessage);
      sreLogger.error('Geocoding error', {}, err as Error);
      return [];
    }
  };

  const reverseGeocode = async (lng: number, lat: number): Promise<string> => {
    setError(null);
    
    const startTime = performance.now();
    sreLogger.info('Reverse geocoding request started', { lng, lat });
    
    try {
      if (!mapboxToken) {
        throw new Error('Token Mapbox non disponibile');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=place,locality&language=it&limit=1`
      );
      
      if (!response.ok) {
        sreLogger.error('Reverse geocoding request failed', { 
          lng,
          lat,
          status: response.status 
        });
        throw new Error('Errore nella ricerca della posizione');
      }
      
      const data = await response.json();
      const placeName = data.features[0]?.place_name || 'Posizione sconosciuta';

      const duration = performance.now() - startTime;
      sreLogger.logMetric('reverse_geocoding_duration', duration, 'ms', {
        has_result: (placeName !== 'Posizione sconosciuta').toString()
      });

      return placeName;
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
    isLoading: false,
    error
  };
};

// Hook with React Query caching + performance monitoring
export const useGeocodingQuery = (query: string) => {
  const { token: mapboxToken } = useMapboxToken();

  return useQuery<GeocodeResult[]>({
    queryKey: ['geocode', query],
    queryFn: async () => {
      if (!query.trim() || query.length < 3) return [];
      
      const startTime = performance.now();
      sreLogger.info('Geocoding query started', { 
        query,
        queryLength: query.length,
        source: 'useGeocodingQuery'
      });
      
      if (!mapboxToken) {
        throw new Error('Token Mapbox non disponibile');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&types=place,locality,address&country=IT&language=it&limit=5`
      );
      
      if (!response.ok) {
        sreLogger.error('Geocoding query failed', { 
          query,
          status: response.status 
        });
        throw new Error('Errore nella ricerca della località');
      }
      
      const data = await response.json();
      const results = data.features.map((feature: { place_name: string; center: [number, number]; bbox?: [number, number, number, number] }) => ({
        place_name: feature.place_name,
        center: feature.center,
        bbox: feature.bbox
      }));

      const duration = performance.now() - startTime;
      sreLogger.logMetric('geocoding_query_duration', duration, 'ms', {
        query_length: query.length.toString(),
        results_count: results.length.toString(),
        cached: 'no'
      });

      return results;
    },
    enabled: query.length >= 3 && !!mapboxToken,
    staleTime: 5 * 60 * 1000, // 5 minuti - cached queries will not refetch
    gcTime: 30 * 60 * 1000,    // 30 minuti - data stays in memory
    retry: 2,
    retryDelay: 1000,
  });
};
