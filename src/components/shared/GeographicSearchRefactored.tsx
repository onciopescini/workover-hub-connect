
import React from 'react';
import { GeographicSearchContainer } from './geographic-search/GeographicSearchContainer';

interface GeographicSearchProps {
  value?: string;
  onChange?: (location: string, coordinates?: { lat: number; lng: number }) => void;
  onLocationSelect?: (location: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

export const GeographicSearch: React.FC<GeographicSearchProps> = (props) => {
  return <GeographicSearchContainer {...props} />;
};
