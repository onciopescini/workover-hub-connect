
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useLocationParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read parameters synchronously for immediate availability
  const cityParam = searchParams.get('city');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const radiusParam = searchParams.get('radius');
  const dateParam = searchParams.get('date');
  const startTimeParam = searchParams.get('startTime');
  const endTimeParam = searchParams.get('endTime');
  
  // New filters
  const categoryParam = searchParams.get('category');
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');
  const workEnvParam = searchParams.get('workEnv');
  const capacityParam = searchParams.get('minCapacity');
  const amenitiesParam = searchParams.get('amenities');

  const initialCity = cityParam ? decodeURIComponent(cityParam) : '';
  
  // Memoize coordinates to prevent unstable object references causing infinite loops
  const initialCoordinates = useMemo(() => {
    if (latParam && lngParam) {
      return {
        lat: parseFloat(latParam),
        lng: parseFloat(lngParam)
      };
    }
    return null;
  }, [latParam, lngParam]);
  const initialRadius = radiusParam ? parseInt(radiusParam) : 10;
  const initialDate = dateParam ? new Date(dateParam) : null;
  const initialStartTime = startTimeParam || null;
  const initialEndTime = endTimeParam || null;

  // New initial values
  const initialCategory = categoryParam || '';
  const initialPriceRange: [number, number] = [
    minPriceParam ? parseInt(minPriceParam) : 0,
    maxPriceParam ? parseInt(maxPriceParam) : 200
  ];
  const initialWorkEnvironment = workEnvParam || '';
  const initialMinCapacity = capacityParam ? parseInt(capacityParam) : 1;
  const initialAmenities = amenitiesParam ? amenitiesParam.split(',') : [];

  const updateLocationParam = (
    city?: string,
    coordinates?: { lat: number; lng: number },
    radius?: number,
    filters?: {
      category?: string;
      priceRange?: [number, number];
      workEnvironment?: string;
      amenities?: string[];
      minCapacity?: number;
      date?: Date | null;
      startTime?: string | null;
      endTime?: string | null;
    }
  ) => {
    // Location & Radius
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
    
    if (radius) {
      searchParams.set('radius', radius.toString());
    } else if (!coordinates) {
      searchParams.delete('radius');
    }

    // Filters
    if (filters) {
      if (filters.category) searchParams.set('category', filters.category);
      else searchParams.delete('category');

      if (filters.priceRange) {
        if (filters.priceRange[0] > 0) searchParams.set('minPrice', filters.priceRange[0].toString());
        else searchParams.delete('minPrice');

        if (filters.priceRange[1] < 200) searchParams.set('maxPrice', filters.priceRange[1].toString());
        else searchParams.delete('maxPrice');
      }

      if (filters.workEnvironment) searchParams.set('workEnv', filters.workEnvironment);
      else searchParams.delete('workEnv');

      if (filters.amenities && filters.amenities.length > 0) searchParams.set('amenities', filters.amenities.join(','));
      else searchParams.delete('amenities');

      if (filters.minCapacity && filters.minCapacity > 1) searchParams.set('minCapacity', filters.minCapacity.toString());
      else searchParams.delete('minCapacity');

      if (filters.date) searchParams.set('date', filters.date.toISOString());
      else searchParams.delete('date');

      if (filters.startTime) searchParams.set('startTime', filters.startTime);
      else searchParams.delete('startTime');

      if (filters.endTime) searchParams.set('endTime', filters.endTime);
      else searchParams.delete('endTime');
    }
    
    setSearchParams(searchParams);
  };

  return {
    initialCity,
    initialCoordinates,
    initialRadius,
    initialDate,
    initialStartTime,
    initialEndTime,
    initialCategory,
    initialPriceRange,
    initialWorkEnvironment,
    initialMinCapacity,
    initialAmenities,
    updateLocationParam
  };
};
