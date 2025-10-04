
import React, { useState } from 'react';
import { InteractiveCard } from '@/components/ui/InteractiveCard';
import { ParallaxSection } from '@/components/ui/ParallaxSection';
import { MapPin, Wifi, Coffee, Users, Monitor, Car } from 'lucide-react';
import { API_ENDPOINTS } from "@/constants";

export function SpacesGallerySection() {
  const [activeCategory, setActiveCategory] = useState('all');

  const spaceImages = [
    {
      id: 1,
      image: "photo-1497366216548-37526070297c", // modern office
      title: "Ufficio Moderno Milano",
      category: "office",
      location: "Milano Centro",
      price: "25€/ora",
      features: ["Wifi", "Monitor", "Parcheggio"],
      amenities: [Wifi, Monitor, Car]
    },
    {
      id: 2,
      image: "photo-1524758631624-e2822e304c36", // coworking space
      title: "Coworking Creativo",
      category: "coworking",
      location: "Roma Trastevere",
      price: "18€/ora",
      features: ["Caffè", "Wifi", "Community"],
      amenities: [Coffee, Wifi, Users]
    },
    {
      id: 3,
      image: "photo-1556761175-b413da4baf72", // meeting room
      title: "Sala Meeting Executive",
      category: "meeting",
      location: "Torino Centro",
      price: "45€/ora",
      features: ["Monitor", "Wifi", "Parcheggio"],
      amenities: [Monitor, Wifi, Car]
    },
    {
      id: 4,
      image: "photo-1519389950473-47ba0277781c", // tech workspace
      title: "Spazio Tech Startup",
      category: "tech",
      location: "Bologna",
      price: "30€/ora",
      features: ["Wifi", "Monitor", "Community"],
      amenities: [Wifi, Monitor, Users]
    },
    {
      id: 5,
      image: "photo-1542744173-8e7e53415bb0", // creative space
      title: "Studio Creativo",
      category: "creative",
      location: "Firenze",
      price: "22€/ora",
      features: ["Wifi", "Caffè", "Community"],
      amenities: [Wifi, Coffee, Users]
    },
    {
      id: 6,
      image: "photo-1497366811353-6870744d04b2", // corporate office
      title: "Ufficio Corporate",
      category: "office",
      location: "Napoli",
      price: "35€/ora",
      features: ["Monitor", "Parcheggio", "Wifi"],
      amenities: [Monitor, Car, Wifi]
    }
  ];

  const categories = [
    { id: 'all', label: 'Tutti gli Spazi' },
    { id: 'office', label: 'Uffici' },
    { id: 'coworking', label: 'Coworking' },
    { id: 'meeting', label: 'Sale Meeting' },
    { id: 'tech', label: 'Tech Space' },
    { id: 'creative', label: 'Spazi Creativi' }
  ];

  const filteredSpaces = activeCategory === 'all' 
    ? spaceImages 
    : spaceImages.filter(space => space.category === activeCategory);

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Scopri spazi{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">
              unici
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Dalle case private agli uffici professionali, trova lo spazio perfetto per ogni esigenza
          </p>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                  activeCategory === category.id
                    ? 'bg-gradient-to-r from-indigo-600 to-emerald-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:text-gray-900 shadow-md hover:shadow-lg'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Spaces Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSpaces.map((space, index) => (
            <ParallaxSection key={space.id} speed={0.1 * (index % 3)}>
              <InteractiveCard 
                className="h-full overflow-hidden"
                hoverScale={true}
                tiltEffect={true}
                glowEffect={true}
              >
                <div className="p-0">
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={`${API_ENDPOINTS.UNSPLASH_BASE}/${space.image}?auto=format&fit=crop&w=600&q=80`}
                      alt={space.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Price Badge */}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="font-bold text-gray-900">{space.price}</span>
                    </div>
                    
                    {/* Location */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">{space.location}</span>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {space.title}
                    </h3>
                    
                    {/* Amenities */}
                    <div className="flex items-center gap-4 mb-4">
                      {space.amenities.map((Icon, iconIndex) => (
                        <div key={iconIndex} className="flex items-center gap-1 text-gray-600">
                          <Icon className="w-4 h-4" />
                        </div>
                      ))}
                    </div>
                    
                    {/* Features */}
                    <div className="flex flex-wrap gap-2">
                      {space.features.map((feature, featureIndex) => (
                        <span
                          key={featureIndex}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </InteractiveCard>
            </ParallaxSection>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center mt-16">
          <button className="bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-xl transform hover:scale-105 transition-all duration-300">
            Esplora Tutti gli Spazi
          </button>
        </div>
      </div>
    </section>
  );
}
