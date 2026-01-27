import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';
import * as mapboxService from '@/services/api/mapboxService';
import { useLogger } from "@/hooks/useLogger";

interface AddressSuggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  text: string;
  place_type: string[];
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  hasCoordinates?: boolean;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Inizia a digitare l'indirizzo...",
  error,
  disabled = false,
  hasCoordinates = false
}) => {
  const { error: logError } = useLogger({ context: 'AddressAutocomplete' });
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if mapbox service is ready (token can be fetched)
  useEffect(() => {
    const checkToken = async () => {
      const token = await mapboxService.getMapboxToken();
      setIsReady(!!token);
    };
    checkToken();
  }, []);

  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await mapboxService.searchAddresses(query, {
        types: 'address,poi',
        limit: 5
      });

      if (result.success && result.suggestions) {
        setSuggestions(result.suggestions);
        setShowSuggestions(true);
      } else {
        logError('Failed to fetch address suggestions', new Error(result.error || 'Unknown error'), {
          operation: 'fetch_address_suggestions',
          query
        });
        setSuggestions([]);
      }
    } catch (error) {
      logError('Error fetching address suggestions', error as Error, {
        operation: 'fetch_address_suggestions',
        query
      });
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for debounced search
    debounceTimer.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    const coordinates = {
      lat: suggestion.center[1],
      lng: suggestion.center[0]
    };
    
    onChange(suggestion.place_name, coordinates);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="address">
        Indirizzo Completo <span className="text-red-500">*</span>
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="address"
          value={value}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => value.length >= 3 && setShowSuggestions(suggestions.length > 0)}
          placeholder={placeholder}
          disabled={disabled || !isReady}
          className={error ? "border-red-500" : ""}
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-start gap-3"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {suggestion.text}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {suggestion.place_name}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      
      {value && !hasCoordinates && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <MapPin className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>Attenzione:</strong> Seleziona un indirizzo dai suggerimenti per salvare le coordinate GPS. 
            Le coordinate sono necessarie per pubblicare lo spazio.
          </p>
        </div>
      )}
      
      {!isReady && (
        <p className="text-sm text-yellow-600">
          Caricamento suggerimenti indirizzi...
        </p>
      )}
      
      <p className="text-sm text-gray-500">
        Inizia a digitare per vedere i suggerimenti di indirizzi. Le coordinate GPS saranno salvate automaticamente.
      </p>
    </div>
  );
};
