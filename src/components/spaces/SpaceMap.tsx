import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createRoot, Root } from 'react-dom/client';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Space } from '@/types/space';
import { SpaceMapPreview } from './SpaceMapPreview';
import { sreLogger } from '@/lib/sre-logger';
import { useMapboxToken } from '@/contexts/MapboxTokenContext';

interface Coordinates {
  lat: number;
  lng: number;
}

interface SpaceMapProps {
  spaces: Space[];
  userLocation: Coordinates | null;
  searchCenter?: Coordinates | null;
  searchRadiusKm?: number;
  onSpaceClick: (spaceId: string) => void;
  currentUserId: string | null;
  highlightedSpaceId?: string | null;
}

const isValidCoordinate = (coords: unknown): coords is Coordinates => {
  if (!coords || typeof coords !== 'object') {
    return false;
  }

  const candidate = coords as Partial<Coordinates>;
  return (
    typeof candidate.lat === 'number'
    && !Number.isNaN(candidate.lat)
    && Number.isFinite(candidate.lat)
    && typeof candidate.lng === 'number'
    && !Number.isNaN(candidate.lng)
    && Number.isFinite(candidate.lng)
  );
};

const SEARCH_RADIUS_SOURCE_ID = 'search-radius';
const SEARCH_RADIUS_FILL_LAYER_ID = 'search-radius-circle';
const SEARCH_RADIUS_BORDER_LAYER_ID = 'search-radius-border';

const createGeoJSONCircle = (center: [number, number], radiusInKm: number, points = 64) => {
  const [centerLng, centerLat] = center;
  const ring: [number, number][] = [];

  const distanceX = radiusInKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = radiusInKm / 110.574;

  for (let i = 0; i < points; i += 1) {
    const theta = (i / points) * 2 * Math.PI;
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ring.push([centerLng + x, centerLat + y]);
  }

  if (ring[0]) {
    ring.push([ring[0][0], ring[0][1]]);
  }

  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [ring],
        },
        properties: {},
      },
    ],
  };
};

export const SpaceMap: React.FC<SpaceMapProps> = React.memo(({
  spaces,
  userLocation,
  searchCenter,
  searchRadiusKm = 10,
  onSpaceClick,
  currentUserId,
  highlightedSpaceId,
}) => {
  const queryClient = useQueryClient();
  const { token: mapboxToken, isLoading: isLoadingToken, error: tokenError } = useMapboxToken();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const markerMapRef = useRef<Record<string, mapboxgl.Marker>>({});
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const popupRootsRef = useRef<WeakMap<HTMLElement, Root>>(new WeakMap());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const lastDrawnRef = useRef<Coordinates & { radius: number }>({ lat: 0, lng: 0, radius: 0 });

  const isStyleLoadedRef = useRef<boolean>(false);
  const pendingStyleTasksRef = useRef<Map<string, (mapInstance: mapboxgl.Map) => void>>(new Map());

  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const validSpaces = useMemo(() => (
    spaces.filter((space) => (
      Number.isFinite(space.latitude) && Number.isFinite(space.longitude)
    ))
  ), [spaces]);

  const safeOnSpaceClick = useCallback((spaceId: string): void => {
    requestAnimationFrame(() => {
      onSpaceClick(spaceId);
    });
  }, [onSpaceClick]);

  const cleanupPopups = useCallback(() => {
    popupsRef.current.forEach((popup) => {
      const popupElement = popup.getElement();
      if (popupElement) {
        const root = popupRootsRef.current.get(popupElement);
        if (root) {
          root.unmount();
          popupRootsRef.current.delete(popupElement);
        }
      }
      popup.remove();
    });
    popupsRef.current = [];
  }, []);

  const flushStyleTasks = useCallback((): void => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !isStyleLoadedRef.current) {
      return;
    }

    const tasks = Array.from(pendingStyleTasksRef.current.values());
    pendingStyleTasksRef.current.clear();

    tasks.forEach((task) => {
      try {
        task(mapInstance);
      } catch (taskError) {
        sreLogger.error('Failed to execute style task', {}, taskError as Error);
      }
    });
  }, []);

  const scheduleStyleTask = useCallback((key: string, task: (mapInstance: mapboxgl.Map) => void): void => {
    const mapInstance = mapRef.current;
    if (!mapInstance) {
      return;
    }

    if (isStyleLoadedRef.current && mapInstance.isStyleLoaded()) {
      task(mapInstance);
      return;
    }

    pendingStyleTasksRef.current.set(key, task);
  }, []);

  const removeSearchRadiusLayers = useCallback((mapInstance: mapboxgl.Map): void => {
    if (mapInstance.getLayer(SEARCH_RADIUS_FILL_LAYER_ID)) {
      mapInstance.removeLayer(SEARCH_RADIUS_FILL_LAYER_ID);
    }
    if (mapInstance.getLayer(SEARCH_RADIUS_BORDER_LAYER_ID)) {
      mapInstance.removeLayer(SEARCH_RADIUS_BORDER_LAYER_ID);
    }
    if (mapInstance.getSource(SEARCH_RADIUS_SOURCE_ID)) {
      mapInstance.removeSource(SEARCH_RADIUS_SOURCE_ID);
    }
  }, []);

  const upsertSearchRadiusLayers = useCallback((mapInstance: mapboxgl.Map, center: Coordinates, radiusKm: number): void => {
    const circleData = createGeoJSONCircle([center.lng, center.lat], radiusKm);

    const existingSource = mapInstance.getSource(SEARCH_RADIUS_SOURCE_ID);
    if (existingSource && 'setData' in existingSource) {
      existingSource.setData(circleData);
    } else {
      removeSearchRadiusLayers(mapInstance);

      mapInstance.addSource(SEARCH_RADIUS_SOURCE_ID, {
        type: 'geojson',
        data: circleData,
      });

      mapInstance.addLayer({
        id: SEARCH_RADIUS_FILL_LAYER_ID,
        type: 'fill',
        source: SEARCH_RADIUS_SOURCE_ID,
        paint: {
          'fill-color': '#4F46E5',
          'fill-opacity': 0.1,
        },
      });

      mapInstance.addLayer({
        id: SEARCH_RADIUS_BORDER_LAYER_ID,
        type: 'line',
        source: SEARCH_RADIUS_SOURCE_ID,
        paint: {
          'line-color': '#4F46E5',
          'line-width': 2,
          'line-opacity': 0.6,
        },
      });
    }

    const bounds = new mapboxgl.LngLatBounds();
    const coordinates = circleData.features[0]?.geometry?.coordinates?.[0] ?? [];
    coordinates.forEach((coord) => bounds.extend(coord));
    mapInstance.fitBounds(bounds, { padding: 50, maxZoom: 14 });
  }, [removeSearchRadiusLayers]);

  useEffect(() => {
    if (tokenError) {
      setError(tokenError);
    }
  }, [tokenError]);

  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken || mapRef.current) {
      return;
    }

    const pendingStyleTasks = pendingStyleTasksRef.current;

    mapboxgl.accessToken = mapboxToken;

    const hasValidUserLocation = isValidCoordinate(userLocation);

    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: hasValidUserLocation ? [userLocation.lng, userLocation.lat] : [12.4964, 41.9028],
      zoom: hasValidUserLocation ? 10 : 6,
      attributionControl: false,
      renderWorldCopies: false,
    });

    mapRef.current = mapInstance;

    const handleStyleLoaded = (): void => {
      isStyleLoadedRef.current = true;
      flushStyleTasks();
    };

    const handleStyleData = (): void => {
      if (mapInstance.isStyleLoaded()) {
        handleStyleLoaded();
      }
    };

    const handleLoad = (): void => {
      requestAnimationFrame(() => {
        setMapReady(true);
        setError(null);
      });
      mapInstance.resize();
    };

    const handleError = (event: { error?: Error }): void => {
      sreLogger.error('Map error', { error: event.error });
      setError('Errore nel caricamento della mappa');
    };

    mapInstance.on('load', handleLoad);
    mapInstance.on('style.load', handleStyleLoaded);
    mapInstance.on('styledata', handleStyleData);
    mapInstance.on('click', cleanupPopups);
    mapInstance.on('error', handleError);

    geolocateControlRef.current = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showAccuracyCircle: false,
      showUserLocation: false,
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
    if (geolocateControlRef.current) {
      mapInstance.addControl(geolocateControlRef.current, 'top-right');
    }

    if (mapInstance.isStyleLoaded()) {
      handleStyleLoaded();
    }

    return () => {
      mapInstance.off('load', handleLoad);
      mapInstance.off('style.load', handleStyleLoaded);
      mapInstance.off('styledata', handleStyleData);
      mapInstance.off('click', cleanupPopups);
      mapInstance.off('error', handleError);

      isStyleLoadedRef.current = false;
      pendingStyleTasks.clear();
      cleanupPopups();

      Object.values(markerMapRef.current).forEach((marker) => marker.remove());
      markerMapRef.current = {};

      userMarkerRef.current?.remove();
      userMarkerRef.current = null;

      mapInstance.remove();
      mapRef.current = null;
      geolocateControlRef.current = null;
      setMapReady(false);
    };
  }, [cleanupPopups, flushStyleTasks, mapboxToken, userLocation]);

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const firstEntry = entries[0];
      if (!firstEntry) {
        return;
      }

      const width = firstEntry.contentRect.width;
      const height = firstEntry.contentRect.height;

      setContainerSize((prev) => {
        if (prev.width === width && prev.height === height) {
          return prev;
        }

        if (mapRef.current && width > 0 && height > 0) {
          mapRef.current.resize();
        }

        return { width, height };
      });
    });

    resizeObserverRef.current = observer;
    observer.observe(mapContainerRef.current);

    return () => {
      observer.disconnect();
      resizeObserverRef.current = null;
    };
  }, []);

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !mapReady) {
      return;
    }

    if (!isValidCoordinate(userLocation)) {
      return;
    }

    const currentCenter = mapInstance.getCenter();
    const delta = Math.abs(currentCenter.lng - userLocation.lng) + Math.abs(currentCenter.lat - userLocation.lat);

    if (delta > 0.001 && isValidCoordinate(userLocation)) {
      mapInstance.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 11,
        essential: true,
      });
    }
  }, [mapReady, userLocation]);

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !mapReady) {
      return;
    }

    if (!isValidCoordinate(searchCenter)) {
      scheduleStyleTask('search-radius', (readyMap) => {
        removeSearchRadiusLayers(readyMap);
      });
      lastDrawnRef.current = { lat: 0, lng: 0, radius: 0 };
      return;
    }

    const previousDrawn = lastDrawnRef.current;
    const centerDelta = Math.abs(previousDrawn.lat - searchCenter.lat) + Math.abs(previousDrawn.lng - searchCenter.lng);
    if (previousDrawn.radius === searchRadiusKm && centerDelta < 0.000001) {
      return;
    }

    scheduleStyleTask('search-radius', (readyMap) => {
      if (!isValidCoordinate(searchCenter)) {
        return;
      }

      upsertSearchRadiusLayers(readyMap, searchCenter, searchRadiusKm);
    });
    lastDrawnRef.current = { lat: searchCenter.lat, lng: searchCenter.lng, radius: searchRadiusKm };
  }, [mapReady, removeSearchRadiusLayers, scheduleStyleTask, searchCenter, searchRadiusKm, upsertSearchRadiusLayers]);

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !mapReady) {
      return;
    }

    const activeSpaceIds = new Set(validSpaces.map((space) => space.id));

    Object.keys(markerMapRef.current).forEach((spaceId) => {
      if (!activeSpaceIds.has(spaceId)) {
        markerMapRef.current[spaceId]?.remove();
        delete markerMapRef.current[spaceId];
      }
    });

    validSpaces.forEach((space) => {
      const longitude = Number(space.longitude);
      const latitude = Number(space.latitude);

      if (!isValidCoordinate({ lat: latitude, lng: longitude })) {
        return;
      }

      const existing = markerMapRef.current[space.id];
      const isHighlighted = highlightedSpaceId === space.id;

      if (existing) {
        const markerContent = existing.getElement().querySelector('.space-marker-content');
        if (markerContent instanceof HTMLElement) {
          markerContent.textContent = `€${space.price_per_hour}`;
          markerContent.classList.toggle('animate-pulse', isHighlighted);
          markerContent.classList.toggle('scale-110', isHighlighted);
          markerContent.classList.toggle('bg-indigo-50', isHighlighted);
          markerContent.classList.toggle('border-indigo-600', true);
        }

        const currentPosition = existing.getLngLat();
        if (Math.abs(currentPosition.lng - longitude) > 0.0001 || Math.abs(currentPosition.lat - latitude) > 0.0001) {
          existing.setLngLat([longitude, latitude]);
        }
        return;
      }

      const markerElement = document.createElement('div');
      markerElement.className = 'space-marker';

      const markerContent = document.createElement('div');
      markerContent.className = [
        'space-marker-content',
        'w-auto min-w-[60px] h-8 rounded-full border-2 border-indigo-600 shadow-lg cursor-pointer',
        'flex items-center justify-center px-2 text-indigo-600 text-sm font-bold transition-all duration-200',
        isHighlighted ? 'bg-indigo-50 scale-110 animate-pulse' : 'bg-white',
      ].join(' ');
      markerContent.textContent = `€${space.price_per_hour}`;
      markerElement.appendChild(markerContent);

      markerElement.addEventListener('click', (event) => {
        event.stopPropagation();
        cleanupPopups();

        const popupContainer = document.createElement('div');
        const root = createRoot(popupContainer);
        popupRootsRef.current.set(popupContainer, root);

        root.render(
          <QueryClientProvider client={queryClient}>
            <SpaceMapPreview
              space={space}
              onViewDetails={safeOnSpaceClick}
              currentUserId={currentUserId}
            />
          </QueryClientProvider>
        );

        const popup = new mapboxgl.Popup({ offset: 25, closeButton: true, closeOnClick: false, maxWidth: 'none' })
          .setDOMContent(popupContainer)
          .setLngLat([longitude, latitude])
          .addTo(mapInstance);

        popupsRef.current.push(popup);

        popup.on('close', () => {
          const rootToCleanup = popupRootsRef.current.get(popupContainer);
          if (rootToCleanup) {
            rootToCleanup.unmount();
            popupRootsRef.current.delete(popupContainer);
          }

          popupsRef.current = popupsRef.current.filter((item) => item !== popup);
        });
      });

      markerMapRef.current[space.id] = new mapboxgl.Marker(markerElement)
        .setLngLat([longitude, latitude])
        .addTo(mapInstance);
    });
  }, [cleanupPopups, currentUserId, highlightedSpaceId, mapReady, queryClient, safeOnSpaceClick, validSpaces]);

  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !mapReady) {
      return;
    }

    if (!isValidCoordinate(userLocation)) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }

    if (!userMarkerRef.current) {
      const markerElement = document.createElement('div');
      const markerContent = document.createElement('div');
      markerContent.className = 'w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse';
      markerElement.appendChild(markerContent);

      userMarkerRef.current = new mapboxgl.Marker(markerElement)
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML('<div class="p-2"><p class="text-sm font-medium">La tua posizione</p></div>')
        )
        .addTo(mapInstance);
    }

    userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
  }, [mapReady, userLocation]);

  if (isLoadingToken) {
    return (
      <div className="relative w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2" />
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
      <div ref={mapContainerRef} id="space-map-container" className="w-full h-full" />

      {import.meta.env.MODE === 'development' && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs p-2 rounded z-10">
          Container: {containerSize.width}x{containerSize.height}
          <br />
          Ready: {mapReady ? '✅' : '❌'}
          <br />
          Style: {isStyleLoadedRef.current ? '✅' : '❌'}
          <br />
          Token: {mapboxToken ? '✅' : '❌'}
        </div>
      )}

      {validSpaces.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-background/95 backdrop-blur-sm rounded-full px-2 py-1.5 shadow-md border z-10">
          <span className="text-xs text-foreground font-medium">{validSpaces.length} spazi</span>
        </div>
      )}

      {!mapReady && !error && (
        <div className="absolute inset-0 bg-muted/50 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Caricamento mappa...</p>
            {!isStyleLoadedRef.current && (
              <p className="text-xs text-muted-foreground/80 mt-1">Attendo il caricamento dello stile...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
