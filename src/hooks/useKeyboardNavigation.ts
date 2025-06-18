
import { useEffect, useCallback } from 'react';

interface UseKeyboardNavigationProps {
  timeSlots: string[];
  selectedIndex: number;
  onSlotSelect: (index: number) => void;
  onSlotActivate: (index: number) => void;
  enabled?: boolean;
}

export const useKeyboardNavigation = ({
  timeSlots,
  selectedIndex,
  onSlotSelect,
  onSlotActivate,
  enabled = true
}: UseKeyboardNavigationProps) => {
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || timeSlots.length === 0) return;

    const { key } = event;
    let newIndex = selectedIndex;

    switch (key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(selectedIndex + 1, timeSlots.length - 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(selectedIndex - 1, 0);
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = timeSlots.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSlotActivate(selectedIndex);
        return;
      case 'Escape':
        event.preventDefault();
        onSlotSelect(-1);
        return;
      default:
        return;
    }

    if (newIndex !== selectedIndex) {
      onSlotSelect(newIndex);
    }
  }, [enabled, timeSlots.length, selectedIndex, onSlotSelect, onSlotActivate]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return {
    selectedIndex,
    isNavigating: enabled && selectedIndex >= 0
  };
};
