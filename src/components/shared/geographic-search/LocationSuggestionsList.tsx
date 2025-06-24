
import React from 'react';
import { MapPin } from 'lucide-react';

interface GeocodeResult {
  place_name: string;
  center: [number, number];
}

interface LocationSuggestionsListProps {
  suggestions: GeocodeResult[];
  onSuggestionSelect: (suggestion: GeocodeResult) => void;
  isVisible: boolean;
}

export const LocationSuggestionsList: React.FC<LocationSuggestionsListProps> = ({
  suggestions,
  onSuggestionSelect,
  isVisible
}) => {
  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          type="button"
          className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-2"
          onClick={() => onSuggestionSelect(suggestion)}
        >
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="text-sm">{suggestion.place_name}</span>
        </button>
      ))}
    </div>
  );
};
