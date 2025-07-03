import { useState, useEffect } from 'react';

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useGuidedTour = (tourId: string, steps: TourStep[]) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(`tour_completed_${tourId}`);
    setHasCompletedTour(!!completed);
  }, [tourId]);

  const startTour = () => {
    setIsOpen(true);
  };

  const closeTour = () => {
    setIsOpen(false);
  };

  const markAsCompleted = () => {
    localStorage.setItem(`tour_completed_${tourId}`, 'true');
    setHasCompletedTour(true);
    setIsOpen(false);
  };

  const resetTour = () => {
    localStorage.removeItem(`tour_completed_${tourId}`);
    setHasCompletedTour(false);
  };

  return {
    isOpen,
    hasCompletedTour,
    startTour,
    closeTour,
    markAsCompleted,
    resetTour,
    steps
  };
};