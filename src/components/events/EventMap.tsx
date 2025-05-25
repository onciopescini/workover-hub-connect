
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { EventWithDetails } from '@/types/event';

interface EventMapProps {
  events: EventWithDetails[];
  userLocation: {lat: number, lng: number} | null;
  onEventClick: (eventId: string) => void;
}

export const EventMap: React.FC<EventMapProps> = ({ events, userLocation, onEventClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = 'pk.eyJ1IjoidGVzdC1tYXBib3giLCJhIjoiY2xldjZxN3poMDhsNzQzcGl1aDd2a2xvNCJ9.example';
    
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
  }, [userLocation]);

  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    events.forEach(event => {
      if (event.space?.latitude && event.space?.longitude) {
        const el = document.createElement('div');
        el.className = 'w-8 h-8 bg-purple-600 rounded-full border-2 border-white shadow-lg cursor-pointer flex items-center justify-center text-white text-xs font-bold hover:bg-purple-700 transition-colors';
        el.innerHTML = '📅';
        
        el.addEventListener('click', () => {
          onEventClick(event.id);
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([event.space.longitude, event.space.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-semibold">${event.title}</h3>
                  <p class="text-sm text-gray-600">${event.space.address}</p>
                  <p class="text-sm text-purple-600">${new Date(event.date).toLocaleDateString()}</p>
                </div>
              `)
          )
          .addTo(map.current!);

        markers.current.push(marker);
      }
    });
  }, [events, onEventClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg max-w-sm">
        <p className="text-sm text-gray-600">
          <strong>Nota:</strong> Per visualizzare la mappa, è necessario configurare il token Mapbox.
        </p>
      </div>
    </div>
  );
};
