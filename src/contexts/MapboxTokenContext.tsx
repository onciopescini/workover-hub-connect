import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as mapboxService from '@/services/api/mapboxService';
import { sreLogger } from '@/lib/sre-logger';

interface MapboxTokenContextType {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const MapboxTokenContext = createContext<MapboxTokenContextType | undefined>(undefined);

export const useMapboxToken = () => {
  const context = useContext(MapboxTokenContext);
  if (context === undefined) {
    throw new Error('useMapboxToken must be used within a MapboxTokenProvider');
  }
  return context;
};

interface MapboxTokenProviderProps {
  children: ReactNode;
}

export const MapboxTokenProvider: React.FC<MapboxTokenProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the mapboxService which handles token caching internally
      const fetchedToken = await mapboxService.getMapboxToken();
      
      if (fetchedToken) {
        setToken(fetchedToken);
        sreLogger.info('Mapbox token fetched successfully via context', { component: 'MapboxTokenContext' });
      } else {
        setError('Token Mapbox non configurato');
        sreLogger.error('No Mapbox token available', { component: 'MapboxTokenContext' });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      sreLogger.error('Unexpected error fetching Mapbox token', { component: 'MapboxTokenContext' }, err as Error);
      setError(`Errore nel recupero del token: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  const value: MapboxTokenContextType = {
    token,
    isLoading,
    error,
    refetch: fetchToken,
  };

  return (
    <MapboxTokenContext.Provider value={value}>
      {children}
    </MapboxTokenContext.Provider>
  );
};
