
import { useState, useEffect } from 'react';

export const useViewportHeight = () => {
  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight;
    }
    return 0;
  });

  const [headerHeight, setHeaderHeight] = useState(64); // Default header height
  const [footerHeight, setFooterHeight] = useState(260); // Default footer height

  useEffect(() => {
    const calculateHeights = () => {
      if (typeof window === 'undefined') return;

      // Update viewport height
      setViewportHeight(window.innerHeight);

      // Calculate header height
      const headerElement = document.querySelector('header') || document.querySelector('[data-header]');
      if (headerElement) {
        setHeaderHeight(headerElement.getBoundingClientRect().height);
      }

      // Calculate footer height
      const footerElement = document.querySelector('footer') || document.querySelector('[data-footer]');
      if (footerElement) {
        setFooterHeight(footerElement.getBoundingClientRect().height);
      }
    };

    // Initial calculation
    calculateHeights();

    // Recalculate on resize
    window.addEventListener('resize', calculateHeights);
    
    // Use ResizeObserver for more accurate measurements if available
    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(calculateHeights);
      const headerElement = document.querySelector('header') || document.querySelector('[data-header]');
      const footerElement = document.querySelector('footer') || document.querySelector('[data-footer]');
      
      if (headerElement) resizeObserver.observe(headerElement);
      if (footerElement) resizeObserver.observe(footerElement);
      
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', calculateHeights);
      };
    }

    return () => {
      window.removeEventListener('resize', calculateHeights);
    };
  }, []);

  const availableHeight = Math.max(200, viewportHeight - headerHeight - footerHeight - 32); // 32px for padding

  return {
    viewportHeight,
    headerHeight,
    footerHeight,
    availableHeight
  };
};
