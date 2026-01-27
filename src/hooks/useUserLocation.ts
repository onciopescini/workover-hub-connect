import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { sreLogger } from '@/lib/sre-logger';

interface Coordinates {
  lat: number;
  lng: number;
}

interface UseUserLocationResult {
  userLocation: Coordinates | null;
  isLoading: boolean;
  error: string | null;
  getUserLocation: () => Promise<Coordinates | null>;
}

// Default fallback: Milan, Italy
const DEFAULT_LOCATION: Coordinates = { lat: 45.4642, lng: 9.1900 };

export const useUserLocation = (): UseUserLocationResult => {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserLocation = useCallback(async (): Promise<Coordinates | null> => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      const errorMsg = 'Geolocalizzazione non supportata dal browser';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsLoading(false);
      return null;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000 // 10 minutes cache
        });
      });

      const coords: Coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      setUserLocation(coords);
      setIsLoading(false);
      sreLogger.info('User location obtained', { component: 'useUserLocation', coords });
      return coords;

    } catch (geoError: unknown) {
      let errorMessage = 'Errore nel recupero della posizione';
      const geolocationError = geoError as GeolocationPositionError;
      
      switch (geolocationError.code) {
        case GeolocationPositionError.PERMISSION_DENIED:
          errorMessage = 'Accesso alla posizione negato';
          toast.warning('Accesso alla posizione negato. Mostro risultati da Milano.');
          break;
        case GeolocationPositionError.POSITION_UNAVAILABLE:
          errorMessage = 'Posizione non disponibile';
          toast.warning('Posizione non disponibile. Mostro risultati da Milano.');
          break;
        case GeolocationPositionError.TIMEOUT:
          errorMessage = 'Timeout nel recupero della posizione';
          toast.warning('Timeout posizione. Mostro risultati da Milano.');
          break;
      }

      setError(errorMessage);
      setUserLocation(DEFAULT_LOCATION); // Set default location on error
      setIsLoading(false);
      
      sreLogger.warn('Geolocation failed, using default', { 
        component: 'useUserLocation',
        errorCode: geolocationError.code,
        fallback: DEFAULT_LOCATION
      });
      
      return DEFAULT_LOCATION;
    }
  }, []);

  return {
    userLocation,
    isLoading,
    error,
    getUserLocation
  };
};
