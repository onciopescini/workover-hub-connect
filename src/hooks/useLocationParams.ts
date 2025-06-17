
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export const useLocationParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialCity, setInitialCity] = useState<string>('');

  useEffect(() => {
    const cityParam = searchParams.get('city');
    if (cityParam) {
      setInitialCity(decodeURIComponent(cityParam));
    }
  }, [searchParams]);

  const updateLocationParam = (city: string) => {
    if (city) {
      searchParams.set('city', encodeURIComponent(city));
    } else {
      searchParams.delete('city');
    }
    setSearchParams(searchParams);
  };

  return {
    initialCity,
    updateLocationParam
  };
};
