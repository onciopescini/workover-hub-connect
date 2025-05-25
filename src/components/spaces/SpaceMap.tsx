
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Space } from '@/types/space';

interface SpaceMapProps {
  spaces: Space[];
  userLocation: {lat: number, lng: number} | null;
  onSpaceClick: (spaceId: string) => void;
}

export const SpaceMap: React.FC<SpaceMapProps> = ({ spaces, userLocation, onSpaceClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    mapboxgl.accessToken = 'pk.eyJ1IjoidGVzdC1tYXBib3giLCJhIjoiY2xldjZxN3poMDhsNzQzcGl1aDd2a2xvNCJ9.example'; // You'll need to add your Mapbox token
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: userLocation ? [userLocation.lng, userLocation.lat] : [12.4964, 41.9028], // Default to Rome
      zoom: 12,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [userLocation]);

  // Add markers for spaces
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add new markers
    spaces.forEach(space => {
      if (space.latitude && space.longitude) {
        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'w-8 h-8 bg-indigo-600 rounded-full border-2 border-white shadow-lg cursor-pointer flex items-center justify-center text-white text-xs font-bold hover:bg-indigo-700 transition-colors';
        el.innerHTML = '€' + space.price_per_hour;
        
        el.addEventListener('click', () => {
          onSpaceClick(space.id);
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([space.longitude, space.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-semibold">${space.title}</h3>
                  <p class="text-sm text-gray-600">${space.address}</p>
                  <p class="text-sm font-bold text-indigo-600">€${space.price_per_hour}/ora</p>
                </div>
              `)
          )
          .addTo(map.current!);

        markers.current.push(marker);
      }
    });
  }, [spaces, onSpaceClick]);

  // Add user location marker
  useEffect(() => {
    if (!map.current || !userLocation) return;

    const userMarker = document.createElement('div');
    userMarker.className = 'w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg';
    
    new mapboxgl.Marker(userMarker)
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML('<div class="p-2"><p class="text-sm">La tua posizione</p></div>')
      )
      .addTo(map.current);
  }, [userLocation]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Map overlay with token requirement message */}
      <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg max-w-sm">
        <p className="text-sm text-gray-600">
          <strong>Nota:</strong> Per visualizzare la mappa, è necessario configurare il token Mapbox.
        </p>
      </div>
    </div>
  );
};
