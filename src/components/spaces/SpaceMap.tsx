
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Space } from '@/types/space';
import { supabase } from '@/integrations/supabase/client';
import { SpaceMapPreview } from './SpaceMapPreview';
import { createRoot } from 'react-dom/client';
import { useLogger } from "@/hooks/useLogger";

interface SpaceMapProps {
  spaces: Space[];
  userLocation: {lat: number, lng: number} | null;
  onSpaceClick: (spaceId: string) => void;
  highlightedSpaceId?: string | null;
}

export const SpaceMap: React.FC<SpaceMapProps> = React.memo(({ 
  spaces, 
  userLocation, 
  onSpaceClick,
  highlightedSpaceId 
}) => {
  const { error: logError } = useLogger({ context: 'SpaceMap' });
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const popups = useRef<mapboxgl.Popup[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Memoize callbacks to prevent re-renders
  const handleSpaceClick = useCallback((spaceId: string) => {
    onSpaceClick(spaceId);
  }, [onSpaceClick]);

  // Memoize spaces processing to prevent unnecessary recalculations  
  const processedSpaces = useMemo(() => {
    return spaces?.filter(space => 
      space.latitude && 
      space.longitude && 
      !isNaN(Number(space.latitude)) && 
      !isNaN(Number(space.longitude))
    ) || [];
  }, [spaces]);

  // Memoized spaces with proper key generation
  const memoizedSpaces = useMemo(() => {
    const validSpaces = spaces.filter(space => space.latitude && space.longitude);
    return validSpaces;
  }, [spaces.length, spaces.map(s => `${s.id}-${s.latitude}-${s.longitude}-${s.price_per_hour}`).join(',')]);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          logError('Error fetching Mapbox token', error as Error, {
            operation: 'fetch_mapbox_token'
          });
          setError('Impossibile caricare la mappa');
          return;
        }

        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setError('Token Mapbox non configurato');
        }
      } catch (err) {
        logError('Error fetching Mapbox token', err as Error, {
          operation: 'fetch_mapbox_token_exception'
        });
        setError('Errore nel caricamento della mappa');
      } finally {
        setIsLoadingToken(false);
      }
    };

    fetchMapboxToken();
  }, []);

  // Initialize map - Versione migliorata con debug
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    console.log('🗺️ Initializing Mapbox map with token:', mapboxToken ? 'Available' : 'Missing');
    
    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: userLocation ? [userLocation.lng, userLocation.lat] : [12.4964, 41.9028],
        zoom: userLocation ? 12 : 6,
        attributionControl: false
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Handle map events
      map.current.on('load', () => {
        console.log('✅ Map loaded successfully');
        setMapReady(true);
        setError(null);
      });

      map.current.on('error', (e) => {
        console.error('❌ Map error:', e.error);
        setError('Errore nel caricamento della mappa');
      });

      map.current.on('click', () => {
        // Close all popups when clicking on map
        popups.current.forEach(popup => popup.remove());
        popups.current = [];
      });

      // Force resize after a short delay to ensure proper rendering
      setTimeout(() => {
        if (map.current) {
          map.current.resize();
          console.log('🔄 Map resized');
        }
      }, 200);

    } catch (error) {
      console.error('❌ Error initializing map:', error);
      setError('Errore nell\'inizializzazione della mappa');
    }

    return () => {
      console.log('🧹 Cleaning up map');
      if (map.current) {
        setMapReady(false);
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken, userLocation]);

  // Observe container size and force Mapbox resize
  useEffect(() => {
    if (!mapContainer.current || !map.current) return;
    const ro = new ResizeObserver(() => {
      try { map.current?.resize(); } catch {}
    });
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, [mapReady]);

  // Update map center when userLocation changes
  useEffect(() => {
    if (!map.current || !mapReady || !userLocation) return;
    
    map.current.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 11, // City-level zoom
      essential: true
    });
  }, [userLocation, mapReady]);

  // Add/update markers
  useEffect(() => {
    if (!map.current || !mapReady || !memoizedSpaces.length) return;

    // Clear existing markers
    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};
    
    popups.current.forEach(popup => popup.remove());
    popups.current = [];

    // Add new markers
    memoizedSpaces.forEach((space) => {
      if (!map.current || !mapReady || !space.latitude || !space.longitude) return;

      try {
        const isHighlighted = highlightedSpaceId === space.id;
        
        const markerEl = document.createElement('div');
        markerEl.className = 'space-marker';
        
        // Create marker content safely without innerHTML
        const markerContent = document.createElement('div');
        markerContent.className = `w-auto min-w-[60px] h-8 bg-white rounded-full border-2 ${
          isHighlighted ? 'border-indigo-600 bg-indigo-50 scale-110 shadow-lg' : 'border-indigo-600'
        } shadow-lg cursor-pointer flex items-center justify-center px-2 text-indigo-600 text-sm font-bold hover:bg-indigo-600 hover:text-white transition-all duration-200 ${
          isHighlighted ? 'animate-pulse' : ''
        }`;
        
        // Safely set text content to prevent XSS
        markerContent.textContent = `€${space.price_per_hour}`;
        markerEl.appendChild(markerContent);
        
        markerEl.addEventListener('click', (e) => {
          e.stopPropagation();
          onSpaceClick(space.id);
          
          // Close existing popups
          popups.current.forEach(popup => popup.remove());
          popups.current = [];
          
          try {
            const popupContainer = document.createElement('div');
            const root = createRoot(popupContainer);
            root.render(
              <SpaceMapPreview 
                space={space} 
                onViewDetails={onSpaceClick}
              />
            );

            const popup = new mapboxgl.Popup({
              offset: 25,
              closeButton: true,
              closeOnClick: false,
              maxWidth: 'none'
            })
              .setDOMContent(popupContainer)
              .setLngLat([space.longitude!, space.latitude!]);

            if (map.current && mapReady && mapContainer.current?.isConnected) {
              popup.addTo(map.current);
              popups.current.push(popup);

              popup.on('close', () => {
                try {
                  root.unmount();
                  const index = popups.current.indexOf(popup);
                  if (index > -1) {
                    popups.current.splice(index, 1);
                  }
                } catch (error) {
                  // Silently handle popup cleanup errors to avoid noise
                }
              });
            }
          } catch (error) {
            logError('Error creating popup', error as Error, {
              operation: 'create_popup',
              spaceId: space.id
            });
          }
        });

        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([space.longitude!, space.latitude!]);

        if (map.current && mapReady && mapContainer.current?.isConnected) {
          marker.addTo(map.current);
          markers.current[space.id] = marker;
        }
      } catch (error) {
        logError('Failed to add marker for space', error as Error, {
          operation: 'add_marker',
          spaceId: space.id
        });
      }
    });
  }, [memoizedSpaces, mapReady, onSpaceClick, highlightedSpaceId]);

  // Add user location marker
  useEffect(() => {
    if (!map.current || !mapReady || !userLocation || !mapContainer.current?.isConnected) return;

    try {
      const userMarkerEl = document.createElement('div');
      
      // Create user location marker safely without innerHTML
      const userMarkerContent = document.createElement('div');
      userMarkerContent.className = 'w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse';
      userMarkerEl.appendChild(userMarkerContent);
      
      new mapboxgl.Marker(userMarkerEl)
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setDOMContent((() => {
              const popupContent = document.createElement('div');
              popupContent.className = 'p-2';
              const text = document.createElement('p');
              text.className = 'text-sm font-medium';
              text.textContent = 'La tua posizione';
              popupContent.appendChild(text);
              return popupContent;
            })())
        )
        .addTo(map.current);
    } catch (error) {
      logError('Error adding user location marker', error as Error, {
        operation: 'add_user_location_marker',
        userLocation
      });
    }
  }, [userLocation, mapReady]);

  if (isLoadingToken) {
    return (
      <div className="relative w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Inizializzazione mappa...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <p className="text-xs text-gray-500">La mappa non è disponibile al momento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[420px] md:h-[520px] rounded-lg overflow-hidden">
      <div ref={mapContainer} id="space-map-container" className="absolute inset-0" />
      
      {memoizedSpaces.length > 0 && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <span className="text-sm text-gray-700">{memoizedSpaces.length} spazi disponibili</span>
        </div>
      )}
    </div>
  );
});
