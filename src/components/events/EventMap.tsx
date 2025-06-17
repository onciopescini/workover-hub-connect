
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { SimpleEvent } from '@/hooks/usePublicEvents';

interface EventMapProps {
  events: SimpleEvent[];
  userLocation: {lat: number, lng: number} | null;
  onEventClick: (eventId: string) => void;
  highlightedEventId?: string | null;
}

export const EventMap: React.FC<EventMapProps> = ({ 
  events, 
  userLocation, 
  onEventClick,
  highlightedEventId 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token') as any;
        
        if (error) {
          console.error('Error fetching Mapbox token:', error);
          setError('Impossibile caricare la mappa');
          return;
        }

        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setError('Token Mapbox non configurato');
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Errore nel caricamento della mappa');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapboxToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: userLocation ? [userLocation.lng, userLocation.lat] : [12.4964, 41.9028],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [userLocation, mapboxToken]);

  // Add/update event markers
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};

    events.forEach(event => {
      if (event.spaces?.latitude && event.spaces?.longitude) {
        const isHighlighted = highlightedEventId === event.id;
        
        const el = document.createElement('div');
        el.className = 'w-8 h-8 rounded-full border-2 border-white shadow-lg cursor-pointer flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-all duration-200';
        el.style.backgroundColor = isHighlighted ? '#7c3aed' : '#8b5cf6';
        if (isHighlighted) {
          el.classList.add('animate-pulse', 'scale-110');
        }
        el.innerHTML = '📅';
        
        el.addEventListener('click', () => {
          onEventClick(event.id);
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([event.spaces.longitude, event.spaces.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-semibold">${event.title}</h3>
                  <p class="text-sm text-gray-600">${event.spaces.address}</p>
                  <p class="text-sm text-purple-600">${new Date(event.date).toLocaleDateString()}</p>
                </div>
              `)
          )
          .addTo(map.current!);

        markers.current[event.id] = marker;
      }
    });
  }, [events, onEventClick, highlightedEventId]);

  if (isLoading) {
    return (
      <div className="relative w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Caricamento mappa...</p>
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
      
      {events.length > 0 && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <span className="text-sm text-gray-700">{events.length} eventi disponibili</span>
        </div>
      )}
    </div>
  );
};
