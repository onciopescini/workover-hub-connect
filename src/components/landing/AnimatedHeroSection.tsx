import React from 'react';
import { Button } from '@/components/ui/button';
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
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop"
          alt="Modern coworking space"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Main Heading */}
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            Il futuro del lavoro è{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-emerald-400 to-purple-400">
              <TypewriterText words={dynamicWords} />
            </span>
          </h1>
          
          {/* Subtitle with fade-in animation */}
          <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in drop-shadow-md">
            Scopri spazi di lavoro unici e connettiti con professionisti
            che trasformeranno la tua esperienza di networking.
          </p>
          
          {/* Enhanced Search Filters */}
          <SearchFilters />
          
          <div className="mt-8 flex justify-center gap-4">
            {!authState.isAuthenticated ? (
              <>
                <Button
                  size="lg"
                  onClick={() => navigate('/login')}
                  variant="default"
                  className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-8"
                >
                  Accedi
                </Button>
                <Button
                  size="lg"
                  onClick={() => navigate('/register')}
                  variant="outline"
                  className="bg-transparent text-white border-white hover:bg-white/10 font-semibold px-8"
                >
                  Registrati
                </Button>
              </>
            ) : (
              authState.profile && !authState.profile.onboarding_completed && !isAdmin && (
                <Button
                  size="lg"
                  onClick={() => navigate('/onboarding')}
                  className="bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white px-8 py-4 text-lg font-semibold shadow-2xl hover-scale-gpu transition-all duration-300"
                >
                  Completa Onboarding
                </Button>
              )
            )}
          </div>
          
          {/* Trust Indicators */}
          <div className="mt-16 flex flex-wrap justify-center items-center gap-8 opacity-80">
            <div className="flex items-center gap-2 text-sm text-white font-medium">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
              <span>Piattaforma Beta Attiva</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white font-medium">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.5)]"></div>
              <span>Pagamenti Sicuri</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white font-medium">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(192,132,252,0.5)]"></div>
              <span>GDPR Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
