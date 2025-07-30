
import React from 'react';
import { Button } from '@/components/ui/button';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { TypewriterText } from '@/components/ui/TypewriterText';
import { GeographicSearch } from '@/components/shared/GeographicSearch';
import { useNavigate } from 'react-router-dom';

export function AnimatedHeroSection() {
  const navigate = useNavigate();

  const dynamicWords = ['flessibile', 'smart', 'collaborativo', 'innovativo'];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <AnimatedBackground className="absolute inset-0" />
      
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Main Heading */}
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Il futuro del lavoro è{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-emerald-600 to-purple-600">
              <TypewriterText words={dynamicWords} />
            </span>
          </h1>
          
          {/* Subtitle with fade-in animation */}
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in">
            Scopri spazi di lavoro unici e connettiti con professionisti
            che trasformeranno la tua esperienza lavorativa.
          </p>
          
          {/* Enhanced Search Bar */}
          <div className="max-w-md mx-auto mb-12 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <div className="relative">
              <GeographicSearch 
                placeholder="Trova spazi nella tua città..."
                className="w-full shadow-2xl border-2 border-white/20 backdrop-blur-sm"
              />
            </div>
          </div>
          
          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white px-8 py-4 text-lg font-semibold shadow-2xl transform hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/spaces')}
            >
              <span className="relative z-10">Esplora Spazi</span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-emerald-700 rounded-md opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-8 py-4 text-lg font-semibold backdrop-blur-sm bg-white/80 shadow-xl transform hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/events')}
            >
              Scopri Eventi
            </Button>
          </div>
          
          {/* Trust Indicators */}
          <div className="mt-16 flex flex-wrap justify-center items-center gap-8 opacity-70">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Piattaforma Beta Attiva</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Pagamenti Sicuri</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span>GDPR Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
