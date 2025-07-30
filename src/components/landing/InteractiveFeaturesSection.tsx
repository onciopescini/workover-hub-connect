
import React, { useState } from 'react';
import { InteractiveCard } from '@/components/ui/InteractiveCard';
import { MapPin, Users, Calendar, Shield, CreditCard, Clock } from 'lucide-react';

export function InteractiveFeaturesSection() {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  const features = [
    {
      icon: MapPin,
      title: "Spazi Verificati e Sicuri",
      description: "Ogni spazio è ispezionato e certificato per garantire sicurezza e qualità professionale",
      details: "Sistema di verifica in 3 step: ispezione fisica, certificazioni di sicurezza, rating della community",
      color: "from-indigo-500 to-blue-600"
    },
    {
      icon: Users,
      title: "Networking Professionale",
      description: "Connettiti con professionisti verificati che condividono i tuoi obiettivi",
      details: "Profili verificati, sistema di matching intelligente e chat sicura",
      color: "from-emerald-500 to-teal-600"
    },
    {
      icon: Calendar,
      title: "Eventi Esclusivi",
      description: "Workshop, masterclass e eventi di networking per la tua crescita professionale",
      details: "Eventi curati da esperti, accreditamenti professionali, networking post-evento",
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: Shield,
      title: "Sicurezza Garantita",
      description: "Assicurazione inclusa, identità verificate, pagamenti protetti",
      details: "Copertura assicurativa, verifica documenti, sistema di recensioni bidirezionale",
      color: "from-orange-500 to-red-600"
    },
    {
      icon: CreditCard,
      title: "Pagamenti Sicuri",
      description: "Transazioni protette con Stripe, nessun costo nascosto",
      details: "Pagamenti SSL, protezione acquirenti, politiche di rimborso trasparenti",
      color: "from-cyan-500 to-blue-600"
    },
    {
      icon: Clock,
      title: "Flessibilità Totale",
      description: "Prenota per ore, giorni o periodi più lunghi secondo le tue esigenze",
      details: "Cancellazione gratuita, modifiche facili, disponibilità in tempo reale",
      color: "from-violet-500 to-purple-600"
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Perché scegliere{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">
              Workover
            </span>
            ?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Una piattaforma completa per trasformare il tuo modo di lavorare con tecnologia all'avanguardia
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isActive = activeFeature === index;
            
            return (
              <InteractiveCard
                key={index}
                className="h-full"
                hoverScale={true}
                tiltEffect={true}
                glowEffect={true}
              >
                <div 
                  className="p-8 h-full cursor-pointer"
                  onMouseEnter={() => setActiveFeature(index)}
                  onMouseLeave={() => setActiveFeature(null)}
                >
                  {/* Icon with gradient background */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mx-auto mb-6 transform transition-all duration-300 ${isActive ? 'scale-110 rotate-6' : ''}`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                    {feature.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-gray-600 text-center mb-4 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  {/* Expandable details */}
                  <div className={`overflow-hidden transition-all duration-500 ${isActive ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm text-gray-500 text-center leading-relaxed">
                        {feature.details}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress indicator */}
                  <div className={`mt-4 h-1 bg-gray-200 rounded-full overflow-hidden transition-all duration-500`}>
                    <div className={`h-full bg-gradient-to-r ${feature.color} transform transition-all duration-500 ${isActive ? 'translate-x-0' : '-translate-x-full'}`} />
                  </div>
                </div>
              </InteractiveCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
