
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMapboxGeocoding } from '@/hooks/useMapboxGeocoding';
import { LocationInput } from './LocationInput';
import { LocationSuggestionsList } from './LocationSuggestionsList';
import { cn } from '@/lib/utils';

interface GeocodeResult {
  place_name: string;
  center: [number, number];
}

interface GeographicSearchContainerProps {
  value?: string;
  onChange?: (location: string, coordinates?: { lat: number; lng: number }) => void;
  onLocationSelect?: (location: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

export const GeographicSearchContainer: React.FC<GeographicSearchContainerProps> = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Cerca per città o indirizzo...",
  className = ""
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = value !== undefined ? value : internalSearchQuery;
  
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { geocodeAddress, reverseGeocode, isLoading } = useMapboxGeocoding();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined && value !== internalSearchQuery) {
      setInternalSearchQuery(value);
    }
  }, [value]);

  const handleSearchInput = useCallback(async (inputValue: string) => {
    if (value === undefined) {
      setInternalSearchQuery(inputValue);
    }
    
    if (onChange) {
      onChange(inputValue);
    }
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (inputValue.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await geocodeAddress(inputValue);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [geocodeAddress, onChange, value]);

  const handleSuggestionSelect = useCallback((suggestion: GeocodeResult) => {
    const selectedLocation = suggestion.place_name;
    
    if (value === undefined) {
      setInternalSearchQuery(selectedLocation);
    }
    
    setShowSuggestions(false);
    setIsSearching(false);
    
    const coordinates = {
      lat: suggestion.center[1],
      lng: suggestion.center[0]
    };

    if (onChange) {
      onChange(selectedLocation, coordinates);
    }
    
    if (onLocationSelect) {
      onLocationSelect(selectedLocation, coordinates);
    } else if (!onChange) {
      navigate(`/spaces?city=${encodeURIComponent(selectedLocation)}&lat=${coordinates.lat}&lng=${coordinates.lng}`);
    }
  }, [onChange, onLocationSelect, navigate, value]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;

    setIsSearching(true);

    try {
      if (suggestions.length > 0) {
        handleSuggestionSelect(suggestions[0]);
        return;
      }

      const results = await geocodeAddress(searchQuery.trim());
      if (results.length > 0) {
        handleSuggestionSelect(results[0]);
      } else {
        if (onChange) {
          onChange(searchQuery.trim());
        } else if (onLocationSelect) {
          onLocationSelect(searchQuery.trim());
        } else {
          navigate(`/spaces?city=${encodeURIComponent(searchQuery.trim())}`);
        }
      }
    } catch (error) {
      console.error('Search submit error:', error);
      if (onChange) {
        onChange(searchQuery.trim());
      } else if (onLocationSelect) {
        onLocationSelect(searchQuery.trim());
      } else {
        navigate(`/spaces?city=${encodeURIComponent(searchQuery.trim())}`);
      }
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, suggestions, handleSuggestionSelect, geocodeAddress, onChange, onLocationSelect, navigate]);

  const getCurrentLocation = useCallback(() => {
    if (isGettingLocation) return;
    
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      alert('La geolocalizzazione non è supportata dal tuo browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const locationName = await reverseGeocode(position.coords.longitude, position.coords.latitude);
          
          if (value === undefined) {
            setInternalSearchQuery(locationName);
          }
          
          const coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          if (onChange) {
            onChange(locationName, coordinates);
          }
          
          if (onLocationSelect) {
            onLocationSelect(locationName, coordinates);
          } else if (!onChange) {
            navigate(`/spaces?lat=${coordinates.lat}&lng=${coordinates.lng}&city=${encodeURIComponent(locationName)}`);
          }
        } catch (error) {
          console.error('Error getting location name:', error);
          alert('Errore nel ottenere la posizione');
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Errore nel accedere alla posizione';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permesso di geolocalizzazione negato';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Posizione non disponibile';
            break;
          case error.TIMEOUT:
            errorMessage = 'Timeout della richiesta di posizione';
            break;
        }
        
        alert(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000
      }
    );
  }, [reverseGeocode, onChange, onLocationSelect, navigate, isGettingLocation, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const isCurrentlyLoading = isLoading || isSearching || isGettingLocation;

  return (
    <div className={cn("relative", className)} ref={suggestionsRef}>
      <LocationInput
        value={searchQuery}
        onChange={handleSearchInput}
        onSubmit={handleSearch}
        onGetCurrentLocation={getCurrentLocation}
        placeholder={placeholder}
        isLoading={isCurrentlyLoading}
        isGettingLocation={isGettingLocation}
        disabled={isCurrentlyLoading}
      />
      
      <LocationSuggestionsList
        suggestions={suggestions}
        onSuggestionSelect={handleSuggestionSelect}
        isVisible={showSuggestions && !isCurrentlyLoading}
      />
    </div>
  );
};
