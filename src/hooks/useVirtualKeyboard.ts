import { useState, useEffect } from 'react';

/**
 * Hook to detect virtual keyboard height on mobile devices using the Visual Viewport API.
 * This allows us to adjust layout (e.g. add padding) so input fields aren't covered.
 */
export const useVirtualKeyboard = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    // Check for support
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const handleResize = () => {
      if (!window.visualViewport) return;

      // The visual viewport's height is the height of the visible area of the page.
      // When the virtual keyboard is open, this height decreases.
      const viewportHeight = window.visualViewport.height;
      const windowHeight = window.innerHeight;

      // Calculate the difference
      const diff = windowHeight - viewportHeight;

      // We consider the keyboard open if the difference is significant (e.g. > 150px)
      // to avoid false positives from browser chrome appearing/disappearing.
      // Note: This threshold might need tuning.
      const isOpen = diff > 150;

      setKeyboardHeight(isOpen ? diff : 0);
      setIsKeyboardOpen(isOpen);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);

    // Initial check
    handleResize();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
    };
  }, []);

  return { keyboardHeight, isKeyboardOpen };
};
