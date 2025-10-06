
import React, { useState, useEffect } from 'react';
import { InteractiveCard } from '@/components/ui/InteractiveCard';
import { Search, MapPin, Calendar, CreditCard, MessageCircle, Star } from 'lucide-react';
import { API_ENDPOINTS } from "@/constants";

export function VisualWorkflowSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      icon: Search,
      title: "Cerca & Scopri",
      description: "Trova spazi di lavoro nella tua zona utilizzando filtri avanzati",
      image: "photo-1460925895917-afdab827c52f", // laptop on table
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: MapPin,
      title: "Esplora & Filtra",
      description: "Visualizza dettagli, foto, recensioni e posizione degli spazi",
      image: "photo-1487958449943-2429e8be8625", // modern building
      color: "from-indigo-500 to-purple-600"
    },
    {
      icon: Calendar,
      title: "Prenota Facilmente",
      description: "Seleziona date, orari e conferma la tua prenotazione in pochi click",
      image: "photo-1581091226825-a6a2a5aee158", // woman with laptop
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: CreditCard,
      title: "Paga in Sicurezza",
      description: "Transazioni protette con Stripe, nessun costo nascosto",
      image: "photo-1721322800607-8c38375eef04", // living room
      color: "from-pink-500 to-red-600"
    },
    {
      icon: MessageCircle,
      title: "Connetti & Collabora",
      description: "Incontra altri professionisti e crea connessioni durature",
      image: "photo-1483058712412-4245e9b90334", // landscape/nature
      color: "from-emerald-500 to-teal-600"
    },
    {
      icon: Star,
      title: "Valuta & Cresci",
      description: "Lascia recensioni e contribuisci alla community",
      image: "photo-1460925895917-afdab827c52f", // laptop
      color: "from-teal-500 to-cyan-600"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Come funziona{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">
              Workover
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Un processo semplice e intuitivo per trasformare il tuo modo di lavorare
          </p>
        </div>

        {/* Interactive Timeline */}
        <div className="relative mb-16">
          {/* Progress Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-1000"
              style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Step Indicators */}
          <div className="relative flex justify-between items-center">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= activeStep;
              const isCurrent = index === activeStep;
              
              return (
                <div
                  key={index}
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() => setActiveStep(index)}
                >
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isActive 
                        ? `bg-gradient-to-r ${step.color} text-white shadow-lg scale-110` 
                        : 'bg-white border-2 border-gray-300 text-gray-400'
                    } ${isCurrent ? 'animate-pulse' : ''}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`mt-2 text-sm font-medium transition-colors duration-300 ${
                    isActive ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    Step {index + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Step Details */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <InteractiveCard className="overflow-hidden" hoverScale={false} tiltEffect={false}>
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
                <img
                  src={`${API_ENDPOINTS.UNSPLASH_BASE}/${steps[activeStep]?.image}?auto=format&fit=crop&w=800&q=75`}
                  alt={steps[activeStep]?.title}
                  width="800"
                  height="450"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-all duration-500 will-change-transform hover:scale-105"
                  style={{ aspectRatio: '16/9' }}
                />
              </div>
            </InteractiveCard>
          </div>

          <div className="order-1 lg:order-2">
            <div className="max-w-lg">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${steps[activeStep]?.color} text-white mb-6`}>
                {(() => {
                  const Icon = steps[activeStep]?.icon;
                  return Icon ? <Icon className="w-5 h-5" /> : null;
                })()}
                <span className="font-medium">Step {activeStep + 1}</span>
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                {steps[activeStep]?.title}
              </h3>
              
              <p className="text-lg text-gray-600 leading-relaxed">
                {steps[activeStep]?.description}
              </p>
              
              {/* Step Navigation */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  disabled={activeStep === 0}
                >
                  ← Precedente
                </button>
                <button
                  onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  disabled={activeStep === steps.length - 1}
                >
                  Successivo →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
