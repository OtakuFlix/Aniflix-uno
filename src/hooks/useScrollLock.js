import { useEffect } from 'react';

const useScrollLock = () => {
  useEffect(() => {
    // Only apply scroll lock on PC (screens wider than 1024px)
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    
    const handleMediaChange = (e) => {
      if (e.matches) {
        // Lock scroll on PC
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
      } else {
        // Unlock scroll on mobile/tablet
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
      }
    };

    // Set initial state
    handleMediaChange(mediaQuery);

    // Listen for changes in viewport size
    mediaQuery.addEventListener('change', handleMediaChange);

    // Cleanup function
    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    };
  }, []);
};

export default useScrollLock;
