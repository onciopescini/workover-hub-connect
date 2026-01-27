import { useState } from 'react';
import * as mapboxService from '@/services/api/mapboxService';

interface GeocodeResult {
  place_name: string;
  center: [number, number]; // [lng, lat]
  bbox?: [number, number, number, number] | undefined;
}

export const useMapboxGeocoding = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocodeAddress = async (query: string): Promise<GeocodeResult[]> => {
    if (!query.trim()) return [];
    
    setIsLoading(true);
    setError(null);
    
    const result = await mapboxService.searchAddresses(query, {
      types: 'place,locality,address'
    });
    
    setIsLoading(false);
    
    if (!result.success) {
      setError(result.error || 'Errore nella geocodifica');
      return [];
    }
    
    return result.suggestions?.map(s => ({
      place_name: s.place_name,
      center: s.center,
      bbox: s.bbox
    })) || [];
  };

  const reverseGeocode = async (lng: number, lat: number): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    const result = await mapboxService.reverseGeocode(lng, lat);
    
    setIsLoading(false);
    
    if (!result.success) {
      setError(result.error || 'Errore nel reverse geocoding');
      return 'Posizione sconosciuta';
    }
    
    return result.placeName || 'Posizione sconosciuta';
  };

  return {
    geocodeAddress,
    reverseGeocode,
    isLoading,
    error
  };
};
