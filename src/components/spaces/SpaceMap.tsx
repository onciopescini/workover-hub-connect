
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Space } from '@/types/space';
import { SpaceMapPreview } from './SpaceMapPreview';
import { createRoot, Root } from 'react-dom/client';
import { sreLogger } from '@/lib/sre-logger';
import { useMapboxToken } from '@/contexts/MapboxTokenContext';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';

interface SpaceMapProps {
  spaces: Space[];
  userLocation: {lat: number, lng: number} | null;
  searchCenter?: { lat: number; lng: number } | null;
  searchRadiusKm?: number;
  onSpaceClick: (spaceId: string) => void;
  highlightedSpaceId?: string | null;
}

export const SpaceMap: React.FC<SpaceMapProps> = React.memo(({ 
  spaces, 
  userLocation,
  searchCenter,
  searchRadiusKm = 10,
  onSpaceClick,
  highlightedSpaceId 
}) => {
  const queryClient = useQueryClient();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const popups = useRef<mapboxgl.Popup[]>([]);
  const popupRootsRef = useRef<WeakMap<HTMLElement, Root>>(new WeakMap());
  const resizeObserver = useRef<ResizeObserver | null>(null);
  const { token: mapboxToken, isLoading: isLoadingToken, error: tokenError } = useMapboxToken();
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

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

  // Set error from token context
  useEffect(() => {
    if (tokenError) {
      setError(tokenError);
    }
  }, [tokenError]);

  // Stabilized user location ref to prevent re-initialization
  const stableUserLocation = useRef(userLocation);
  const mapInitialized = useRef(false);

  // Update stable user location
  useEffect(() => {
    stableUserLocation.current = userLocation;
  }, [userLocation]);

  // Initialize map once with stable dependencies + performance monitoring
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current || mapInitialized.current) return;

    const initializeMap = () => {
      const container = mapContainer.current;
      if (!container) return false;
      
      const containerRect = container.getBoundingClientRect();
      const startTime = performance.now();
      const stopTimer = sreLogger.startTimer('map_initialization', {
        hasToken: !!mapboxToken,
        initialSpacesCount: spaces.length
      });
      
      sreLogger.debug('Initializing Mapbox map', { 
        hasToken: !!mapboxToken,
        containerSize: { width: containerRect.width, height: containerRect.height }
      });
      
      // Se container ha altezza 0, applica min-height di guardia e ritenta
      if (containerRect.height === 0) {
        container.style.minHeight = '420px';
        sreLogger.warn('Container height was 0, applied min-height fallback');
      }
      
      if (containerRect.width === 0 || containerRect.height === 0) {
        sreLogger.warn('Map container has zero dimensions, retrying...', { containerRect });
        stopTimer();
        return false;
      }
      
      try {
        mapboxgl.accessToken = mapboxToken;
        mapInitialized.current = true;
        
        map.current = new mapboxgl.Map({
          container: container,
          style: 'mapbox://styles/mapbox/light-v11',
          center: stableUserLocation.current ? [stableUserLocation.current.lng, stableUserLocation.current.lat] : [12.4964, 41.9028],
          zoom: stableUserLocation.current ? 10 : 6,
          attributionControl: false,
          renderWorldCopies: false
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Handle map events with performance tracking
        map.current.on('load', () => {
          stopTimer();
          const loadTime = performance.now() - startTime;
          sreLogger.logMetric('map_load_time', loadTime, 'ms', {
            zoom: (stableUserLocation.current ? 10 : 6).toString(),
            hasSpaces: spaces.length > 0 ? 'yes' : 'no'
          });
          
          if (loadTime > 2000) {
            sreLogger.warn('Slow map initialization detected', {
              loadTime,
              spacesCount: spaces.length
            });
          }
          
          sreLogger.debug('Map loaded successfully');
          setMapReady(true);
          setIsMapLoaded(true);
          setError(null);
          
          // Force resize after load
          setTimeout(() => {
            if (map.current && mapContainer.current) {
              map.current.resize();
              sreLogger.debug('Map resized after load');
            }
          }, 100);
        });

        map.current.on('style.load', () => {
          setIsMapLoaded(true);
        });

        map.current.on('error', (e) => {
          sreLogger.error('Map error', { error: e.error });
          setError('Errore nel caricamento della mappa');
        });

        map.current.on('click', () => {
          // Close all popups when clicking on map
          popups.current.forEach(popup => popup.remove());
          popups.current = [];
        });

        return true;

      } catch (error) {
        sreLogger.error('Error initializing map', {}, error as Error);
        setError('Errore nell\'inizializzazione della mappa');
        stopTimer();
        return false;
      }
    };

    // Retry logic con max 5 tentativi
    let retryCount = 0;
    const maxRetries = 5;
    
    const tryInitialize = () => {
      const success = initializeMap();
      
      if (!success && retryCount < maxRetries) {
        retryCount++;
        sreLogger.debug(`Map init retry ${retryCount}/${maxRetries}`);
        setTimeout(tryInitialize, 100 * retryCount); // Backoff progressivo
      } else if (!success) {
        setError('Contenitore mappa non disponibile');
      }
    };

    tryInitialize();

    return () => {
      sreLogger.debug('Cleaning up map');
      if (map.current) {
        setMapReady(false);
        setIsMapLoaded(false);
        map.current.remove();
        map.current = null;
      }
      mapInitialized.current = false;
    };
  }, [mapboxToken, spaces.length]);

  const runWhenStyleReady = useCallback((callback: (currentMap: mapboxgl.Map) => void): void => {
    const currentMap = map.current;
    if (!currentMap || !mapReady) {
      return;
    }

    if (currentMap.isStyleLoaded()) {
      setIsMapLoaded(true);
      callback(currentMap);
      return;
    }

    setIsMapLoaded(false);
    currentMap.once('style.load', () => {
      const loadedMap = map.current;
      if (!loadedMap) {
        return;
      }

      setIsMapLoaded(true);
      callback(loadedMap);
    });
  }, [mapReady]);

  // Debounced container size monitoring to prevent resize loops
  useEffect(() => {
    if (!mapContainer.current) return;

    const container = mapContainer.current;
    let resizeTimeout: NodeJS.Timeout;
    
    resizeObserver.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        // Debounce resize to prevent loops
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          setContainerSize(prevSize => {
            // Only update if size actually changed
            if (prevSize.width !== width || prevSize.height !== height) {
              sreLogger.debug('Container resized', { width, height });
              
              if (map.current && mapReady && width > 0 && height > 0) {
                try {
                  map.current.resize();
                  sreLogger.debug('Map resize triggered');
                } catch (error) {
                  sreLogger.warn('Map resize failed', {}, error as Error);
                }
              }
              return { width, height };
            }
            return prevSize;
          });
        }, 100); // 100ms debounce
      }
    });
    
    resizeObserver.current.observe(container);
    
    return () => {
      clearTimeout(resizeTimeout);
      if (resizeObserver.current) {
        resizeObserver.current.disconnect();
        resizeObserver.current = null;
      }
    };
  }, [mapReady]);

  // Update map center when userLocation changes with stabilized reference
  useEffect(() => {
    if (!map.current || !mapReady || !userLocation) return;
    
    // Only fly to if location is different from current center
    const currentCenter = map.current.getCenter();
    const distance = Math.abs(currentCenter.lng - userLocation.lng) + Math.abs(currentCenter.lat - userLocation.lat);
    
    if (distance > 0.001) { // Only update if meaningful distance change
      map.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 11,
        essential: true
      });
      sreLogger.debug('Map center updated to user location');
    }
  }, [userLocation, mapReady]);

  // Add search radius circle and center marker when searchCenter is provided
  useEffect(() => {
    if (!map.current || !mapReady || !searchCenter) {
      // Remove search visualization if no searchCenter
      if (map.current && mapReady) {
        if (map.current.getLayer('search-radius-circle')) {
          map.current.removeLayer('search-radius-circle');
        }
        if (map.current.getLayer('search-radius-border')) {
          map.current.removeLayer('search-radius-border');
        }
        if (map.current.getSource('search-radius')) {
          map.current.removeSource('search-radius');
        }
      }
      return;
    }

    try {
      // Create GeoJSON circle approximation
      const createGeoJSONCircle = (center: [number, number], radiusInKm: number, points = 64) => {
        const coords = {
          latitude: center[1],
          longitude: center[0]
        };

        const km = radiusInKm;
        const ret: [number, number][] = [];
        const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
        const distanceY = km / 110.574;

        for (let i = 0; i < points; i++) {
          const theta = (i / points) * (2 * Math.PI);
          const x = distanceX * Math.cos(theta);
          const y = distanceY * Math.sin(theta);
          ret.push([coords.longitude + x, coords.latitude + y]);
        }
        // Close the polygon by adding the first point again
        if (ret[0]) {
          ret.push([ret[0][0], ret[0][1]]);
        }

        return {
          type: 'FeatureCollection' as const,
          features: [
            {
              type: 'Feature' as const,
              geometry: {
                type: 'Polygon' as const,
                coordinates: [ret]
              },
              properties: {}
            }
          ]
        };
      };

      const circleData = createGeoJSONCircle([searchCenter.lng, searchCenter.lat], searchRadiusKm);

      runWhenStyleReady((currentMap) => {
        if (currentMap.getLayer('search-radius-circle')) {
          currentMap.removeLayer('search-radius-circle');
        }
        if (currentMap.getLayer('search-radius-border')) {
          currentMap.removeLayer('search-radius-border');
        }
        if (currentMap.getSource('search-radius')) {
          currentMap.removeSource('search-radius');
        }

        currentMap.addSource('search-radius', {
          type: 'geojson',
          data: circleData
        });

        currentMap.addLayer({
          id: 'search-radius-circle',
          type: 'fill',
          source: 'search-radius',
          paint: {
            'fill-color': '#4F46E5',
            'fill-opacity': 0.1
          }
        });

        currentMap.addLayer({
          id: 'search-radius-border',
          type: 'line',
          source: 'search-radius',
          paint: {
            'line-color': '#4F46E5',
            'line-width': 2,
            'line-opacity': 0.6
          }
        });

        const bounds = new mapboxgl.LngLatBounds();
        const coordinates = circleData.features[0]?.geometry?.coordinates[0];
        if (coordinates) {
          coordinates.forEach((coord) => {
            bounds.extend(coord);
          });
        }
        currentMap.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      });

      sreLogger.debug('Search radius visualization added', {
        center: searchCenter,
        radiusKm: searchRadiusKm
      });

    } catch (error) {
      sreLogger.error('Error adding search radius visualization', {}, error as Error);
    }

    return () => {
      if (map.current && mapReady) {
        try {
          runWhenStyleReady((currentMap) => {
            if (currentMap.getLayer('search-radius-circle')) {
              currentMap.removeLayer('search-radius-circle');
            }
            if (currentMap.getLayer('search-radius-border')) {
              currentMap.removeLayer('search-radius-border');
            }
            if (currentMap.getSource('search-radius')) {
              currentMap.removeSource('search-radius');
            }
          });
        } catch (error) {
          sreLogger.warn('Error cleaning up search radius', {}, error as Error);
        }
      }
    };
  }, [searchCenter, searchRadiusKm, mapReady, runWhenStyleReady]);

  // Add/update markers with intelligent diffing - OPTIMIZED
  useEffect(() => {
    if (!map.current || !mapReady || !memoizedSpaces.length) return;

    const startTime = performance.now();
    const stopTimer = sreLogger.startTimer('marker_update', {
      spacesCount: memoizedSpaces.length,
      existingMarkers: Object.keys(markers.current).length
    });

    // Create set of current space IDs for diffing
    const currentSpaceIds = new Set(memoizedSpaces.map(s => s.id));
    const existingSpaceIds = new Set(Object.keys(markers.current));
    
    let addedCount = 0;
    let removedCount = 0;
    let updatedCount = 0;

    // 1. Remove markers for spaces no longer in list
    existingSpaceIds.forEach(spaceId => {
      if (!currentSpaceIds.has(spaceId)) {
        markers.current[spaceId]?.remove();
        delete markers.current[spaceId];
        removedCount++;
      }
    });

    // 2. Add or update markers
    memoizedSpaces.forEach((space) => {
      if (!map.current || !mapReady || !space.latitude || !space.longitude) return;

      try {
        const existingMarker = markers.current[space.id];
        const isHighlighted = highlightedSpaceId === space.id;

        if (existingMarker) {
          // Update existing marker
          const markerEl = existingMarker.getElement();
          const content = markerEl.querySelector('.space-marker > div');
          
          if (content) {
            // Update highlight state
            if (isHighlighted) {
              content.classList.add('border-indigo-600', 'bg-indigo-50', 'scale-110', 'shadow-lg', 'animate-pulse');
              content.classList.remove('border-gray-300');
            } else {
              content.classList.remove('border-indigo-600', 'bg-indigo-50', 'scale-110', 'shadow-lg', 'animate-pulse');
              content.classList.add('border-gray-300');
            }
            
            // Update price if changed
            const newPrice = `€${space.price_per_hour}`;
            if (content.textContent !== newPrice) {
              content.textContent = newPrice;
            }
          }
          
          // Update position if coordinates changed
          const currentLngLat = existingMarker.getLngLat();
          if (Math.abs(currentLngLat.lng - space.longitude) > 0.0001 || 
              Math.abs(currentLngLat.lat - space.latitude) > 0.0001) {
            existingMarker.setLngLat([space.longitude, space.latitude]);
          }
          
          updatedCount++;
        } else {
          // Create new marker
          const markerEl = document.createElement('div');
          markerEl.className = 'space-marker';
          
          const markerContent = document.createElement('div');
          markerContent.className = `w-auto min-w-[60px] h-8 bg-white rounded-full border-2 ${
            isHighlighted ? 'border-indigo-600 bg-indigo-50 scale-110 shadow-lg' : 'border-indigo-600'
          } shadow-lg cursor-pointer flex items-center justify-center px-2 text-indigo-600 text-sm font-bold hover:bg-indigo-600 hover:text-white transition-all duration-200 ${
            isHighlighted ? 'animate-pulse' : ''
          }`;
          
          markerContent.textContent = `€${space.price_per_hour}`;
          markerEl.appendChild(markerContent);
          
          markerEl.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const popupStartTime = performance.now();
            
            // Close existing popups and cleanup roots
            popups.current.forEach(popup => {
              const popupElement = popup.getElement();
              if (popupElement) {
                const existingRoot = popupRootsRef.current.get(popupElement);
                if (existingRoot) {
                  try {
                    existingRoot.unmount();
                    popupRootsRef.current.delete(popupElement);
                  } catch (error) {
                    sreLogger.error('Error unmounting popup root', { spaceId: space.id }, error as Error);
                  }
                }
              }
              popup.remove();
            });
            popups.current = [];
            
            try {
              const popupContainer = document.createElement('div');
              
              // Create new root and track it
              const root = createRoot(popupContainer);
              popupRootsRef.current.set(popupContainer, root);
              
              root.render(
                <QueryClientProvider client={queryClient}>
                  <SpaceMapPreview 
                    space={space} 
                    onViewDetails={onSpaceClick}
                  />
                </QueryClientProvider>
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

                const popupTime = performance.now() - popupStartTime;
                sreLogger.logMetric('popup_creation_time', popupTime, 'ms', {
                  spaceId: space.id
                });

                popup.on('close', () => {
                  try {
                    const rootToCleanup = popupRootsRef.current.get(popupContainer);
                    if (rootToCleanup) {
                      rootToCleanup.unmount();
                      popupRootsRef.current.delete(popupContainer);
                    }
                    
                    const index = popups.current.indexOf(popup);
                    if (index > -1) {
                      popups.current.splice(index, 1);
                    }
                  } catch (error) {
                    sreLogger.error('Error cleaning up popup on close', { spaceId: space.id }, error as Error);
                  }
                });
              }
            } catch (error) {
              sreLogger.error('Error creating popup', { spaceId: space.id }, error as Error);
            }
          });

          const marker = new mapboxgl.Marker(markerEl)
            .setLngLat([space.longitude!, space.latitude!]);

          if (map.current && mapReady && mapContainer.current?.isConnected) {
            marker.addTo(map.current);
            markers.current[space.id] = marker;
            addedCount++;
          }
        }
      } catch (error) {
        sreLogger.error('Failed to add/update marker for space', { spaceId: space.id }, error as Error);
      }
    });

    stopTimer();
    const updateTime = performance.now() - startTime;
    
    sreLogger.debug('Marker update complete', {
      total: memoizedSpaces.length,
      added: addedCount,
      removed: removedCount,
      updated: updatedCount,
      updateTime
    });
    
    if (updateTime > 500) {
      sreLogger.warn('Slow marker update detected', {
        updateTime,
        totalSpaces: memoizedSpaces.length,
        operation: 'marker_update'
      });
    }
  }, [memoizedSpaces, mapReady, onSpaceClick, highlightedSpaceId]);

  // Add user location marker
  useEffect(() => {
    if (!map.current || !mapReady || !userLocation || !mapContainer.current?.isConnected) return;

    try {
      const userMarkerEl = document.createElement('div');
      
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
      sreLogger.error('Error adding user location marker', { userLocation }, error as Error);
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
    <div className="relative w-full h-full min-h-[420px] rounded-lg overflow-hidden bg-muted">
      <div 
        ref={mapContainer} 
        id="space-map-container" 
        className="w-full h-full" 
      />
      
      {/* Debug info per sviluppo */}
      {import.meta.env.MODE === 'development' && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs p-2 rounded z-10">
          Container: {containerSize.width}x{containerSize.height}
          <br />
          Ready: {mapReady ? '✅' : '❌'}
          <br />
          Token: {mapboxToken ? '✅' : '❌'}
        </div>
      )}
      
      {/* Badge spazi disponibili - compacted, bottom-left */}
      {memoizedSpaces.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-background/95 backdrop-blur-sm rounded-full px-2 py-1.5 shadow-md border z-10">
          <span className="text-xs text-foreground font-medium">{memoizedSpaces.length} spazi</span>
        </div>
      )}
      
      {/* Enhanced loading state */}
      {!mapReady && !error && (
        <div className="absolute inset-0 bg-muted/50 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Caricamento mappa...</p>
            {!isMapLoaded && (
              <p className="text-xs text-muted-foreground/80 mt-1">Attendo il caricamento dello stile...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
