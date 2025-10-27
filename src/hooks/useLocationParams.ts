
import { useSearchParams } from 'react-router-dom';

export const useLocationParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read parameters synchronously for immediate availability
  const cityParam = searchParams.get('city');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const radiusParam = searchParams.get('radius'); // NEW
  const dateParam = searchParams.get('date');
  const startTimeParam = searchParams.get('startTime');
  const endTimeParam = searchParams.get('endTime');
  
  const initialCity = cityParam ? decodeURIComponent(cityParam) : '';
  const initialCoordinates = (latParam && lngParam) ? {
    lat: parseFloat(latParam),
    lng: parseFloat(lngParam)
  } : null;
  const initialRadius = radiusParam ? parseInt(radiusParam) : 10; // NEW: Default 10km
  const initialDate = dateParam ? new Date(dateParam) : null;
  const initialStartTime = startTimeParam || null;
  const initialEndTime = endTimeParam || null;

  const updateLocationParam = (city: string, coordinates?: { lat: number; lng: number }, radius?: number) => {
    if (city) {
      searchParams.set('city', encodeURIComponent(city));
    } else {
      searchParams.delete('city');
    }
    
    if (coordinates) {
      searchParams.set('lat', coordinates.lat.toString());
      searchParams.set('lng', coordinates.lng.toString());
    } else {
      searchParams.delete('lat');
      searchParams.delete('lng');
    }
    
    // NEW: Handle radius parameter
    if (radius) {
      searchParams.set('radius', radius.toString());
    } else if (!coordinates) {
      // Remove radius if no coordinates
      searchParams.delete('radius');
    }
    
    setSearchParams(searchParams);
  };

  return {
    initialCity,
    initialCoordinates,
    initialRadius, // NEW
    initialDate,
    initialStartTime,
    initialEndTime,
    updateLocationParam
  };
};
