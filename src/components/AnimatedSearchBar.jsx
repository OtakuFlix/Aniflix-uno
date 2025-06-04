import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CornerDownLeft } from 'lucide-react';

const GoogleGIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.99C17.74 15.61 17.06 16.75 16.07 17.49V20.2H19.8C21.58 18.57 22.56 15.67 22.56 12.25Z" fill="#4285F4"/>
    <path d="M12 23C15.24 23 17.95 21.92 19.8 20.2L16.07 17.49C14.99 18.22 13.62 18.66 12 18.66C9.03 18.66 6.46 16.73 5.49 14.05L1.65 14.05L1.65 16.92C3.44 20.47 7.38 23 12 23Z" fill="#34A853"/>
    <path d="M5.49 14.05C5.24 13.32 5.09 12.55 5.09 11.75C5.09 10.95 5.24 10.18 5.49 9.45L5.49 6.58L1.65 6.58C0.83 8.15 0.36 10 0.36 11.75C0.36 13.5 0.83 15.35 1.65 16.92L5.49 14.05Z" fill="#FBBC05"/>
    <path d="M12 4.34C13.77 4.34 15.35 4.95 16.59 6.12L20.01 2.7C17.95 0.980001 15.24 0 12 0C7.38 0 3.44 2.53 1.65 6.58L5.49 9.45C6.46 6.77 9.03 4.34 12 4.34Z" fill="#EA4335"/>
  </svg>
);

const AnimatedSearchBar = React.memo(() => {
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const fullText = 'aniflix hindi';

  // Typing effect
  useEffect(() => {
    setIsMounted(true);
    let charIndex = 0;
    
    const typingInterval = setInterval(() => {
      if (charIndex < fullText.length) {
        setTypedText(fullText.substring(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => setShowCursor(false), 500);
      }
    }, 100);

    // Cleanup
    return () => {
      clearInterval(typingInterval);
      setTypedText('');
      setShowCursor(true);
      setIsMounted(false);
    };
  }, []);

  // Cursor blink effect
  useEffect(() => {
    if (!isMounted) return;
    
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, [isMounted]);

  const handleSearchClick = useCallback(() => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(fullText)}`, '_blank');
  }, [fullText]);

  if (!isMounted) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="w-full max-w-xl mx-auto lg:mx-0"
      onClick={handleSearchClick}
    >
      <div className="relative flex items-center bg-white border border-gray-300 rounded-full shadow-md p-2.5 md:p-3 cursor-pointer hover:shadow-lg transition-shadow duration-300 group">
        <div className="mx-2 md:mx-3">
          <GoogleGIcon />
        </div>
        <div className="relative flex-grow">
          <span className="text-base md:text-lg text-gray-700 font-sans tracking-wide flex items-center min-h-[24px] md:min-h-[28px]">
            {typedText}
            <span 
              className={`inline-block w-[2px] h-5 md:h-6 bg-red-500 ml-1 align-middle transition-all duration-150 ${showCursor ? 'opacity-100' : 'opacity-0'}`}
              style={{
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.9)',
                marginLeft: '2px',
                borderRadius: '1px',
                transform: 'translateY(-1px)'
              }}
            />
          </span>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="text-gray-500 rounded-full p-1 md:p-1.5 mr-1 hover:text-gray-700 transition-colors group-hover:text-red-500"
        >
          <CornerDownLeft className="h-4 w-4 md:h-5 md:w-5" />
        </motion.div>
      </div>
      <p className="text-xs text-rose-300/80 mt-2.5 text-center lg:text-left">
        Click to search "Aniflix Hindi" on Google
      </p>
    </motion.div>
  );
});

export default AnimatedSearchBar;