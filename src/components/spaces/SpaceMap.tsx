
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Space } from '@/types/space';
import { supabase } from '@/integrations/supabase/client';
import { SpaceMapPreview } from './SpaceMapPreview';
import { createRoot } from 'react-dom/client';

interface SpaceMapProps {
  spaces: Space[];
  userLocation: {lat: number, lng: number} | null;
  onSpaceClick: (spaceId: string) => void;
}

export const SpaceMap: React.FC<SpaceMapProps> = ({ spaces, userLocation, onSpaceClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const popups = useRef<mapboxgl.Popup[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const lastMarkersUpdate = useRef<number>(0);
  const markersUpdateTimeout = useRef<NodeJS.Timeout>();

  // Memoize spaces to prevent unnecessary re-renders
  const memoizedSpaces = useMemo(() => {
    return spaces.filter(space => space.latitude && space.longitude);
  }, [spaces.map(s => `${s.id}-${s.latitude}-${s.longitude}`).join(',')]);

  // Fetch Mapbox token from Supabase Edge Function
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        console.log('🗺️ Fetching Mapbox token...');
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('🔴 Error fetching Mapbox token:', error);
          setError('Impossibile caricare la mappa');
          return;
        }

        if (data?.token) {
          console.log('✅ Mapbox token received');
          setMapboxToken(data.token);
        } else {
          setError('Token Mapbox non configurato');
        }
      } catch (err) {
        console.error('🔴 Error:', err);
        setError('Errore nel caricamento della mappa');
      } finally {
        setIsLoadingToken(false);
      }
    };

    fetchMapboxToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    console.log('🗺️ Initializing map...');
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: userLocation ? [userLocation.lng, userLocation.lat] : [12.4964, 41.9028],
      zoom: 12,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Close all popups when clicking on map
    map.current.on('click', () => {
      popups.current.forEach(popup => popup.remove());
      popups.current = [];
    });

    // Set map ready state when style is loaded
    map.current.on('style.load', () => {
      console.log('✅ Map style loaded and ready');
      setMapReady(true);
    });

    console.log('✅ Map initialized');

    return () => {
      console.log('🧹 Cleaning up map...');
      setMapReady(false);
      map.current?.remove();
    };
  }, [userLocation, mapboxToken]);

  // Debounced function to add markers
  const addMarkersDebounced = useCallback(() => {
    if (!map.current || !mapReady || !memoizedSpaces.length) {
      console.log('🚫 Map not ready for markers', { mapExists: !!map.current, mapReady, spacesCount: memoizedSpaces.length });
      return;
    }

    // Debounce marker updates - don't update if last update was less than 1 second ago
    const now = Date.now();
    if (now - lastMarkersUpdate.current < 1000) {
      console.log('🚫 Markers update debounced');
      return;
    }

    // Clear any pending timeout
    if (markersUpdateTimeout.current) {
      clearTimeout(markersUpdateTimeout.current);
    }

    markersUpdateTimeout.current = setTimeout(() => {
      if (!map.current || !mapReady) return;

      console.log(`🏢 Adding ${memoizedSpaces.length} space markers...`);
      setIsLoadingMarkers(true);
      lastMarkersUpdate.current = Date.now();

      // Clear existing markers and popups
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      popups.current.forEach(popup => popup.remove());
      popups.current = [];

      // Add markers with validation
      memoizedSpaces.forEach((space, index) => {
        if (!map.current || !mapReady) return;

        try {
          // Create enhanced marker element with price
          const markerEl = document.createElement('div');
          markerEl.className = 'space-marker';
          markerEl.innerHTML = `
            <div class="w-auto min-w-[60px] h-8 bg-white rounded-full border-2 border-indigo-600 shadow-lg cursor-pointer flex items-center justify-center px-2 text-indigo-600 text-sm font-bold hover:bg-indigo-600 hover:text-white transition-all duration-200 hover:scale-110">
              €${space.price_per_hour}
            </div>
          `;
          
          // Create popup container
          const popupContainer = document.createElement('div');
          
          // Add click handler to show preview
          markerEl.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Close existing popups
            popups.current.forEach(popup => popup.remove());
            popups.current = [];
            
            // Create React root for the popup content
            const root = createRoot(popupContainer);
            root.render(
              <SpaceMapPreview 
                space={space} 
                onViewDetails={onSpaceClick}
              />
            );

            // Create and show popup
            const popup = new mapboxgl.Popup({
              offset: 25,
              closeButton: true,
              closeOnClick: false,
              maxWidth: 'none'
            })
              .setDOMContent(popupContainer)
              .setLngLat([space.longitude!, space.latitude!]);

            // Ensure map is still ready before adding popup
            if (map.current && mapReady) {
              popup.addTo(map.current);
              popups.current.push(popup);

              // Clean up React root when popup is closed
              popup.on('close', () => {
                root.unmount();
                const index = popups.current.indexOf(popup);
                if (index > -1) {
                  popups.current.splice(index, 1);
                }
              });
            }
          });

          // Create and add marker with validation
          const marker = new mapboxgl.Marker(markerEl)
            .setLngLat([space.longitude!, space.latitude!]);

          // Ensure map is still ready before adding marker
          if (map.current && mapReady) {
            marker.addTo(map.current);
            markers.current.push(marker);
          }
        } catch (error) {
          console.error(`Failed to add marker for space ${space.id}:`, error);
        }
      });

      console.log('✅ All space markers added');
      setIsLoadingMarkers(false);
    }, 100); // Small delay to batch rapid updates
  }, [memoizedSpaces, mapReady, onSpaceClick]);

  // Add markers when spaces change and map is ready
  useEffect(() => {
    addMarkersDebounced();
  }, [addMarkersDebounced]);

  // Add user location marker
  useEffect(() => {
    if (!map.current || !mapReady || !userLocation) return;

    console.log('📍 Adding user location marker...');
    const userMarkerEl = document.createElement('div');
    userMarkerEl.innerHTML = `
      <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
    `;
    
    new mapboxgl.Marker(userMarkerEl)
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML('<div class="p-2"><p class="text-sm font-medium">La tua posizione</p></div>')
      )
      .addTo(map.current);

    console.log('✅ User location marker added');
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
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Loading overlay for markers */}
      {isLoadingMarkers && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
            <span className="text-sm text-gray-700">Caricamento spazi...</span>
          </div>
        </div>
      )}

      {/* Spaces count indicator */}
      {!isLoadingMarkers && memoizedSpaces.length > 0 && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <span className="text-sm text-gray-700">{memoizedSpaces.length} spazi disponibili</span>
        </div>
      )}
    </div>
  );
};
