
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export const useLocationParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialCity, setInitialCity] = useState<string>('');
  const [initialCoordinates, setInitialCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [initialDate, setInitialDate] = useState<Date | null>(null);
  const [initialStartTime, setInitialStartTime] = useState<string | null>(null);
  const [initialEndTime, setInitialEndTime] = useState<string | null>(null);

  useEffect(() => {
    const cityParam = searchParams.get('city');
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const dateParam = searchParams.get('date');
    const startTimeParam = searchParams.get('startTime');
    const endTimeParam = searchParams.get('endTime');
    
    if (cityParam) {
      setInitialCity(decodeURIComponent(cityParam));
    }
    
    if (latParam && lngParam) {
      setInitialCoordinates({
        lat: parseFloat(latParam),
        lng: parseFloat(lngParam)
      });
    }
    
    if (dateParam) {
      setInitialDate(new Date(dateParam));
    }
    
    if (startTimeParam) {
      setInitialStartTime(startTimeParam);
    }
    
    if (endTimeParam) {
      setInitialEndTime(endTimeParam);
    }
  }, [searchParams]);

  const updateLocationParam = (city: string, coordinates?: { lat: number; lng: number }) => {
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
    
    setSearchParams(searchParams);
  };

  return {
    initialCity,
    initialCoordinates,
    initialDate,
    initialStartTime,
    initialEndTime,
    updateLocationParam
  };
};
