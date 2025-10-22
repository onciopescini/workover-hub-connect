import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      
      const { data, error: invokeError } = await supabase.functions.invoke('get-mapbox-token');
      
      if (invokeError) {
        sreLogger.error('Error fetching Mapbox token from edge function', {}, invokeError);
        setError('Impossibile ottenere il token Mapbox');
        return;
      }

      if (data?.token) {
        // Validazione base del token
        if (typeof data.token === 'string' && data.token.length > 0) {
          setToken(data.token);
          sreLogger.info('Mapbox token fetched successfully');
        } else {
          setError('Token Mapbox non valido');
          sreLogger.error('Invalid Mapbox token format', { token: data.token });
        }
      } else {
        setError('Token Mapbox non configurato');
        sreLogger.error('No Mapbox token in response', { data });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      sreLogger.error('Unexpected error fetching Mapbox token', {}, err as Error);
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
