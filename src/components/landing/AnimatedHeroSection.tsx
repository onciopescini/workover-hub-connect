import React from 'react';
import { Button } from '@/components/ui/button';
import { TypewriterText } from '@/components/ui/TypewriterText';
import { SearchFilters } from '@/components/landing/SearchFilters';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { Building2, ShieldCheck, Zap } from 'lucide-react';

export function AnimatedHeroSection() {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { isAdmin } = useRoleAccess();

  const dynamicWords = ['flessibile', 'professionale', 'collaborativo', 'tuo'];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
          alt="Modern coworking space"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-5xl mx-auto">
          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            Il tuo spazio di lavoro, <br />
            <span className="text-indigo-400">
              <TypewriterText words={dynamicWords} />
            </span>
          </h1>
          
          {/* Subtitle with fade-in animation */}
          <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in drop-shadow-md">
            WorkOver ti connette con gli spazi più esclusivi e i professionisti più brillanti.
            Prenota uffici, scrivanie e sale riunioni in un click.
          </p>
          
          {/* Enhanced Search Filters */}
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/20">
             <SearchFilters />
          </div>
          
          {authState.isAuthenticated && authState.profile && !authState.profile.onboarding_completed && !isAdmin && (
            <div className="flex justify-center mt-8">
              <Button
                size="lg"
                onClick={() => navigate('/onboarding')}
                className="bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white px-8 py-6 text-xl font-bold shadow-2xl hover:scale-105 transition-all duration-300"
              >
                Completa il tuo Profilo
              </Button>
            </div>
          )}

           {/* Call to Actions for Visitors */}
           {!authState.isAuthenticated && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
               <Button
                onClick={() => navigate('/search')}
                className="w-full sm:w-auto px-8 py-6 text-lg font-semibold bg-white text-indigo-900 hover:bg-gray-100 shadow-xl"
              >
                Cerca Spazio
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/host/landing')}
                className="w-full sm:w-auto px-8 py-6 text-lg font-semibold bg-indigo-600/80 text-white border-transparent hover:bg-indigo-700 backdrop-blur-sm shadow-xl"
              >
                Diventa Host
              </Button>
            </div>
           )}
          
          {/* Trust Indicators */}
          <div className="mt-20 flex flex-wrap justify-center items-center gap-8 md:gap-12">
            <div className="flex items-center gap-3 text-white/90 bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="font-medium">Prenotazione Istantanea</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="font-medium">Pagamenti Sicuri</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <span className="font-medium">Spazi Verificati</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
