
import { useState, useCallback } from 'react';

export const useMapCardInteraction = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const handleCardClick = useCallback((id: string) => {
    setSelectedId(id);
    setHighlightedId(id);
  }, []);

  const handleMarkerClick = useCallback((id: string) => {
    setSelectedId(id);
    setHighlightedId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setHighlightedId(null);
  }, []);

  return {
    selectedId,
    highlightedId,
    handleCardClick,
    handleMarkerClick,
    clearSelection
  };
};
