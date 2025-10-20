
import React from 'react';
import { Button } from '@/components/ui/button';
import { LazyAnimatedBackground } from '@/components/ui/LazyAnimatedBackground';
import { TypewriterText } from '@/components/ui/TypewriterText';
import { SearchFilters } from '@/components/landing/SearchFilters';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';

export function AnimatedHeroSection() {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { isAdmin } = useRoleAccess();

  const dynamicWords = ['flessibile', 'smart', 'collaborativo', 'innovativo'];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <LazyAnimatedBackground className="absolute inset-0" />
      
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
            che trasformeranno la tua esperienza di networking.
          </p>
          
          {/* Enhanced Search Filters */}
          <SearchFilters />
          
          {authState.isAuthenticated && authState.profile && !authState.profile.onboarding_completed && !isAdmin && (
            <div className="flex justify-center mt-6">
              <Button
                size="lg"
                onClick={() => navigate('/onboarding')}
                className="bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white px-8 py-4 text-lg font-semibold shadow-2xl hover-scale-gpu transition-all duration-300"
              >
                Completa Onboarding
              </Button>
            </div>
          )}
          
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
