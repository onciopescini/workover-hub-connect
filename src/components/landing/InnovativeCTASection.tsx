
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { ParallaxSection } from '@/components/ui/ParallaxSection';
import { ArrowRight, Sparkles, Zap, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function InnovativeCTASection() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  // Simulate beta progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 2;
        return newProgress > 85 ? 75 + Math.random() * 10 : newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const benefits = [
    { icon: Sparkles, text: "Accesso prioritario a nuove funzionalità" },
    { icon: Zap, text: "Supporto dedicato e feedback diretto" },
    { icon: Rocket, text: "Tariffe speciali per early adopters" }
  ];

  return (
    <section className="relative py-24 overflow-hidden">
      <AnimatedBackground className="absolute inset-0" />
      
      <ParallaxSection speed={0.3}>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            {/* Beta Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-emerald-600 text-white px-6 py-3 rounded-full mb-8 shadow-xl">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="font-semibold">Versione Beta Attiva</span>
            </div>
            
            {/* Main Heading */}
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Unisciti al futuro del{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">
                lavoro flessibile
              </span>
            </h2>
            
            {/* Description */}
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Diventa parte della community di early adopters che sta già trasformando 
              il modo di lavorare. Accedi subito alla piattaforma beta.
            </p>
            
            {/* Progress Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 mb-12 shadow-2xl max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Sviluppo Beta in Corso
              </h3>
              
              {/* Progress Bar */}
              <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
              </div>
              
              <p className="text-sm text-gray-600">
                <span className="font-semibold">{Math.round(progress)}%</span> delle funzionalità core completate
              </p>
            </div>
            
            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div 
                    key={index}
                    className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-gray-700 font-medium">{benefit.text}</p>
                  </div>
                );
              })}
            </div>
            
            {/* Call to Action */}
            <div className="space-y-6">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white px-12 py-6 text-xl font-bold shadow-2xl transform hover:scale-105 transition-all duration-300 group"
                onClick={() => navigate('/register')}
              >
                <span className="relative z-10 flex items-center gap-3">
                  Accedi alla Beta
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-emerald-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Button>
              
              <p className="text-gray-600">
                <span className="font-semibold">Gratuito</span> • Nessun costo di iscrizione • Paghi solo quando prenoti
              </p>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 mt-16 opacity-80">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>SSL Sicuro</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span>Pagamenti Stripe</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span>Supporto 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </ParallaxSection>
    </section>
  );
}
