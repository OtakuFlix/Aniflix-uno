import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { ExternalLink, Play, Star, Users, Clock, ArrowRight, Search } from 'lucide-react';
import AnimatedSearchBar from '@/components/AnimatedSearchBar';
import useScrollLock from '@/hooks/useScrollLock';

function App() {
  const [countdown, setCountdown] = useState(10);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { toast } = useToast();

  // Apply scroll lock on PC view
  useScrollLock();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRedirect = () => {
    setIsRedirecting(true);
    toast({
      title: "Redirecting to Aniflix!",
      description: "Taking you to the best Hindi dubbed anime streaming site...",
    });
    
    setTimeout(() => {
      window.location.href = 'https://aniflix.in';
    }, 15000);
  };

  const handleManualRedirect = () => {
    if (!isRedirecting) {
      handleRedirect();
    }
  };

  return (
    <div className="min-h-screen bg-black bg-pattern relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-red-600/10 rounded-full blur-xl floating-animation"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-red-500/10 rounded-full blur-xl floating-animation" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-red-700/10 rounded-full blur-xl floating-animation" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col overflow-y-auto py-0">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="p-2 md:p-3"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src="https://storage.googleapis.com/hostinger-horizons-assets-prod/afaef61c-5fc7-4aa3-adc0-104b6007747f/d626bd5e951b5ec1c91675005d8fa601.png" 
                alt="Aniflix Logo - Best Hindi Dubbed Anime Streaming Site" 
                className="h-10 md:h-12 w-auto hover-scale transition-transform duration-300"
              />
            </div>
            <div className="text-xs flex items-center space-x-1">
              <Clock className="h-3 w-3 text-red-400" />
              <span>Redirecting in:</span>
              <span className="text-red-500 font-bold text-sm">{countdown}s</span>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-0 sm:py-1">
          <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-4 sm:gap-6 items-start py-4 sm:py-6">
            
            {/* Left Content */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center lg:text-left space-y-3 md:space-y-4"
            >
              <div className="space-y-4">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black text-shadow"
                >
                  <span className="text-rose-100">Your Gateway to</span>
                  <br />
                  <span className="gradient-text">Hindi Anime Universe</span>
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="text-xs sm:text-sm text-rose-200 leading-relaxed"
                >
                  Dive into the ultimate collection of <span className="text-red-400 font-semibold">Hindi dubbed anime</span>. 
                  Stream your favorite series and movies in stunning quality, all for free!
                </motion.p>
              </div>

              {/* Features */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="grid grid-cols-3 gap-1 my-2"
              >
                <motion.div 
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="glass-effect rounded-lg p-4 text-center hover-scale"
                >
                  <Star className="h-5 w-5 text-red-500 mx-auto mb-0.5" />
                  <span className="text-rose-200 text-s font-medium">Top Quality Streams</span>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="glass-effect rounded-lg p-4 text-center hover-scale"
                >
                  <Users className="h-6 w-6 text-red-500 mx-auto mb-1" />
                  <span className="text-rose-200 text-s font-medium">Exclusively Hindi Dubbed</span>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="glass-effect rounded-lg p-4 text-center hover-scale"
                >
                  <Play className="h-6 w-6 text-red-500 mx-auto mb-1" />
                  <span className="text-rose-200 text-s font-medium">Always Free Access</span>
                </motion.div>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.0 }}
                className="flex flex-col sm:flex-row gap-2 justify-center lg:justify-start w-full max-w-2xl"
              >
                <Button 
                  onClick={handleManualRedirect}
                  disabled={isRedirecting}
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white font-bold py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm shadow hover:shadow-red-500/60 hover-scale transition-all duration-200 transform focus:ring-2 focus:ring-red-500/50"
                >
                  <Play className="mr-2 h-5 w-5" />
                  {isRedirecting ? 'Teleporting...' : 'Go to Aniflix.in'}
                  <ExternalLink className="ml-2 h-5 w-5" />
                </Button>
                
                <Button 
                  variant="outline"
                  size="lg"
                  className="flex-1 border-red-500/70 text-red-300 hover:bg-red-500/25 hover:text-red-200 hover:border-red-500 font-semibold py-1.5 sm:py-2 px-2 sm:px-4 rounded-lg text-xs sm:text-sm hover-scale transition-all duration-200 transform focus:ring-2 focus:ring-red-500/40"
                  onClick={() => {
                    window.open('https://t.me/Aniflix_Official', '_blank');
                  }}
                >
                  Support Aniflix
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>

              {/* Footer Content */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="mt-3 sm:mt-4 space-y-2"
              >
                <div className="glass-effect rounded-lg p-2 sm:p-3">
                  <p className="text-rose-200 text-xs sm:text-sm leading-relaxed">
                    <span className="text-red-400 font-semibold">Aniflix.in</span> is your ultimate portal for 
                    <span className="text-white font-medium"> high-quality Hindi dubbed anime</span>. 
                    Enjoy endless entertainment with our vast library, always free and updated regularly. 
                    <span className="text-red-400"> Your anime journey starts here!</span>
                  </p>
                </div>
                
                <div className="flex flex-wrap justify-center items-center gap-x-2 sm:gap-x-3 gap-y-1 text-[10px] sm:text-xs text-rose-300/80">
                  <span>© {new Date().getFullYear()} Aniflix</span>
                  <span className="hidden sm:inline">•</span>
                  <span>The Best Hindi Dubbed Anime Hub</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Stream Free Anime Now</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Content - Anime Poster with Discover Section */}
            <div className="flex flex-col space-y-6">
              {/* Discover Aniflix Section */}
              <div className="space-y-4">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-shadow text-center lg:text-left" 
                >
                  <span className="text-rose-100">Discover Aniflix.in:</span>
                </motion.div>

                <div className="my-1 sm:my-2">
                  <AnimatedSearchBar />
                </div>
                
              </div>

              {/* Anime Poster */}
              <motion.div 
                initial={{ opacity: 0, x: 50, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4, type: "spring", stiffness: 100 }}
                className="relative flex justify-center items-start lg:items-center self-start"
              >
                <div className="relative group w-full max-w-md lg:max-w-lg xl:max-w-xl mx-auto">
                  <motion.div 
                    className="absolute -inset-2 md:-inset-4 bg-gradient-to-br from-red-600/20 via-red-700/15 to-red-800/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 animate-pulse"
                    style={{ animationDuration: '4s' }}
                  ></motion.div>
                  <img 
                    src="/thumb.webp" 
                    alt="Anime poster showcasing popular Hindi dubbed anime series available on Aniflix streaming platform" 
                    className="relative z-10 w-full rounded-xl shadow-xl hover-scale transition-all duration-300 border-2 border-red-500/20 group-hover:border-red-400/40"
                    onError={(e) => {
                      console.error('Error loading image:', e);
                      e.target.src = 'https://storage.googleapis.com/hostinger-horizons-assets-prod/afaef61c-5fc7-4aa3-adc0-104b6007747f/e6c531e138b456f86c71a3db8080be69.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-2xl z-20 pointer-events-none flex flex-col justify-end p-4">
                    <div className="bg-black/1 backdrop-blur-sm rounded-lg p-2 sm:p-3 max-w-full border border-white/10">
                      <p className="text-rose-200 text-xs sm:text-sm leading-relaxed text-center">
                        <span className="text-red-400 font-semibold">📣 Spread the Word!</span> Help us by searching for 
                        <span className="text-white font-bold"> "Aniflix"</span> and 
                        <span className="text-white font-bold"> "Aniflix Hindi"</span> on Google.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </main>

        {/* Empty div to maintain layout structure */}
        <div className="h-8"></div>
      </div>

      <Toaster />
    </div>
  );
}

export default App;