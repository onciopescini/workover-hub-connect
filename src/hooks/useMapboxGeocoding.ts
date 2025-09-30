
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

interface GeocodeResult {
  place_name: string;
  center: [number, number]; // [lng, lat]
  bbox?: [number, number, number, number];
}

export const useMapboxGeocoding = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocodeAddress = async (query: string): Promise<GeocodeResult[]> => {
    if (!query.trim()) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
      
      if (tokenError || !tokenData?.token) {
        throw new Error('Impossibile ottenere il token Mapbox');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${tokenData.token}&types=place,locality,address&country=IT&language=it&limit=5`
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
    } finally {
      setIsLoading(false);
    }
  };

  const reverseGeocode = async (lng: number, lat: number): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
      
      if (tokenError || !tokenData?.token) {
        throw new Error('Impossibile ottenere il token Mapbox');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${tokenData.token}&types=place,locality&language=it&limit=1`
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
    } finally {
      setIsLoading(false);
    }
  };

  return {
    geocodeAddress,
    reverseGeocode,
    isLoading,
    error
  };
};
