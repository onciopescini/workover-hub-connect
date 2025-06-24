
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Navigation, Loader2 } from 'lucide-react';
import { useMapboxGeocoding } from '@/hooks/useMapboxGeocoding';
import { cn } from '@/lib/utils';

interface GeocodeResult {
  place_name: string;
  center: [number, number];
}

interface GeographicSearchProps {
  value?: string; // Supporto per controlled component
  onChange?: (location: string, coordinates?: { lat: number; lng: number }) => void; // Alternativa a onLocationSelect
  onLocationSelect?: (location: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

export const GeographicSearch: React.FC<GeographicSearchProps> = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Cerca per città o indirizzo...",
  className = ""
}) => {
  // Usa value prop se fornito (controlled), altrimenti stato interno (uncontrolled)
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

  // Sincronizza stato interno con value prop quando cambia
  useEffect(() => {
    if (value !== undefined && value !== internalSearchQuery) {
      setInternalSearchQuery(value);
    }
  }, [value]);

  // Gestisce la ricerca con debounce
  const handleSearchInput = useCallback(async (inputValue: string) => {
    // Aggiorna lo stato appropriato
    if (value === undefined) {
      setInternalSearchQuery(inputValue);
    }
    
    // Chiama onChange se fornito
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

  // Gestisce la selezione di un suggerimento
  const handleSuggestionSelect = useCallback((suggestion: GeocodeResult) => {
    const selectedLocation = suggestion.place_name;
    
    // Aggiorna lo stato appropriato
    if (value === undefined) {
      setInternalSearchQuery(selectedLocation);
    }
    
    setShowSuggestions(false);
    setIsSearching(false);
    
    const coordinates = {
      lat: suggestion.center[1],
      lng: suggestion.center[0]
    };

    // Chiama entrambi i callback se forniti
    if (onChange) {
      onChange(selectedLocation, coordinates);
    }
    
    if (onLocationSelect) {
      onLocationSelect(selectedLocation, coordinates);
    } else if (!onChange) {
      // Solo se non c'è onChange, naviga (per retrocompatibilità)
      navigate(`/spaces?city=${encodeURIComponent(selectedLocation)}&lat=${coordinates.lat}&lng=${coordinates.lng}`);
    }
  }, [onChange, onLocationSelect, navigate, value]);

  // Gestisce l'invio del form
  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;

    setIsSearching(true);

    try {
      // Se abbiamo suggerimenti, usa il primo
      if (suggestions.length > 0) {
        handleSuggestionSelect(suggestions[0]);
        return;
      }

      // Altrimenti cerca la località
      const results = await geocodeAddress(searchQuery.trim());
      if (results.length > 0) {
        handleSuggestionSelect(results[0]);
      } else {
        // Fallback se nessun risultato
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
      // Fallback anche in caso di errore
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

  // Gestisce la geolocalizzazione
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
          
          // Aggiorna lo stato appropriato
          if (value === undefined) {
            setInternalSearchQuery(locationName);
          }
          
          const coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Chiama entrambi i callback se forniti
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

  // Chiude i suggerimenti quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup del timeout quando il componente viene smontato
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const isCurrentlyLoading = isLoading || isSearching || isGettingLocation;

  return (
    <div className={cn("relative", className)}>
      <form onSubmit={handleSearch} className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="pl-10 pr-4"
            disabled={isCurrentlyLoading}
          />
          {isCurrentlyLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={getCurrentLocation}
          disabled={isCurrentlyLoading}
          title="Usa la mia posizione"
        >
          <Navigation className={`h-4 w-4 ${isGettingLocation ? 'animate-spin' : ''}`} />
        </Button>
        
        <Button type="submit" size="icon" disabled={isCurrentlyLoading}>
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {/* Suggerimenti */}
      {showSuggestions && suggestions.length > 0 && !isCurrentlyLoading && (
        <div 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-2"
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{suggestion.place_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
