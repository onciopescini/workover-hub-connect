
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InteractiveCard } from '@/components/ui/InteractiveCard';
import { ParallaxSection } from '@/components/ui/ParallaxSection';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Wifi, Coffee, Users, Monitor, Car, Armchair, Zap } from 'lucide-react';
import { API_ENDPOINTS } from "@/constants";

// Helper to map feature strings to Lucide icons
const getFeatureIcon = (feature: string) => {
  const lower = feature.toLowerCase();
  if (lower.includes('wifi') || lower.includes('internet')) return Wifi;
  if (lower.includes('caffè') || lower.includes('coffee') || lower.includes('tea')) return Coffee;
  if (lower.includes('monitor') || lower.includes('screen') || lower.includes('tv')) return Monitor;
  if (lower.includes('parcheggio') || lower.includes('parking') || lower.includes('auto')) return Car;
  if (lower.includes('meeting') || lower.includes('riunioni') || lower.includes('sala')) return Users;
  if (lower.includes('relax') || lower.includes('lounge') || lower.includes('divano')) return Armchair;
  return Zap; // Default icon
};

export function SpacesGallerySection() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');

  // Fetch real spaces from Supabase
  const { data: spaces = [], isLoading, error } = useQuery({
    queryKey: ['landing-spaces'],
    queryFn: async () => {
      // Use explicit casting as per instructions for 'workspaces' table
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) {
        console.error('Error fetching landing spaces:', error);
        throw error;
      }

      return (data || []).map((space: any) => ({
        id: space.id,
        image: (space.photos && space.photos[0]) || (space.images && space.images[0]) || null,
        title: space.name,
        category: space.category || 'professional',
        location: space.city || space.address || 'Italia',
        price: space.price_per_hour ? `${space.price_per_hour}€/ora` : `${space.price_per_day}€/giorno`,
        features: (space.features || []).slice(0, 3), // Show top 3 features
        amenities: (space.features || []).slice(0, 3).map((f: string) => getFeatureIcon(f))
      }));
    }
  });

  // Categories aligned with database enums (professional, home, outdoor)
  const categories = [
    { id: 'all', label: 'Tutti gli Spazi' },
    { id: 'professional', label: 'Uffici & Coworking' },
    { id: 'home', label: 'Spazi Privati' },
    { id: 'outdoor', label: 'Outdoor' }
  ];

  const filteredSpaces = activeCategory === 'all' 
    ? spaces
    : spaces.filter((space: any) => space.category === activeCategory);

  // Loading State
  if (isLoading) {
    return (
      <section className="py-24 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Skeleton className="h-12 w-3/4 mx-auto mb-6" />
            <Skeleton className="h-6 w-1/2 mx-auto mb-8" />
            <div className="flex flex-wrap justify-center gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-32 rounded-full" />
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[400px] rounded-xl overflow-hidden bg-white shadow-sm">
                <Skeleton className="h-[250px] w-full" />
                <div className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error State (Fail gracefully)
  if (error) {
    return null; // Or render a simplified section, but better to hide if broken
  }

  // Empty State (Cold Start)
  if (spaces.length === 0) {
    return (
      <section className="py-24 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Inizia la rivoluzione del{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">
              tuo lavoro
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            La piattaforma è pronta per te. Sii il primo a pubblicare uno spazio o a cercare la tua prossima scrivania.
          </p>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate('/host/space/new')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg transition-all"
            >
              Pubblica uno Spazio
            </button>
            <button
               onClick={() => navigate('/search')}
               className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-8 py-4 rounded-lg font-semibold text-lg shadow-sm transition-all"
            >
              Cerca Spazi
            </button>
          </div>
        </div>
      </section>
    );
  }

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
          {filteredSpaces.map((space: any, index: number) => (
            <ParallaxSection key={space.id} speed={0.1 * (index % 3)}>
              <div onClick={() => navigate(`/spaces/${space.id}`)} className="cursor-pointer h-full">
                <InteractiveCard
                  className="h-full overflow-hidden"
                  hoverScale={true}
                  tiltEffect={true}
                  glowEffect={true}
                >
                  <div className="p-0">
                    {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      {space.image ? (
                        <img
                          src={space.image.startsWith('http') ? space.image : `${API_ENDPOINTS.UNSPLASH_BASE}/${space.image}?auto=format&fit=crop&w=400&q=75`}
                          alt={space.title}
                          width="400"
                          height="300"
                          loading={index < 3 ? 'eager' : 'lazy'}
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-500 will-change-transform hover:scale-110"
                          style={{ aspectRatio: '4/3' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <MapPin className="w-12 h-12 opacity-50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Price Badge */}
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                        <span className="font-bold text-gray-900">{space.price}</span>
                      </div>

                      {/* Location */}
                      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                        <MapPin className="w-4 h-4" />
                        <span className="font-medium truncate max-w-[200px]">{space.location}</span>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-3 truncate">
                        {space.title}
                      </h3>

                      {/* Amenities */}
                      <div className="flex items-center gap-4 mb-4 h-6">
                        {space.amenities.map((Icon: any, iconIndex: number) => (
                          <div key={iconIndex} className="flex items-center gap-1 text-gray-600">
                            <Icon className="w-4 h-4" />
                          </div>
                        ))}
                      </div>

                      {/* Features */}
                      <div className="flex flex-wrap gap-2 h-16 content-start overflow-hidden">
                        {space.features.map((feature: string, featureIndex: number) => (
                          <span
                            key={featureIndex}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full whitespace-nowrap"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </InteractiveCard>
              </div>
            </ParallaxSection>
          ))}
        </div>

        {filteredSpaces.length === 0 && activeCategory !== 'all' && (
           <div className="text-center py-12">
             <p className="text-gray-500 text-lg">Nessuno spazio trovato in questa categoria.</p>
             <button
               onClick={() => setActiveCategory('all')}
               className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium"
             >
               Mostra tutti gli spazi
             </button>
           </div>
        )}

        {/* View All CTA */}
        {spaces.length > 0 && (
          <div className="text-center mt-16">
            <button
              onClick={() => navigate('/search')}
              className="bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Esplora Tutti gli Spazi
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
