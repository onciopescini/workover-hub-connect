import { useEffect } from 'react';

interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile' | 'product' | 'place';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  locale?: string;
  siteName?: string;
  noIndex?: boolean;
  canonical?: string;
  structuredData?: any;
}

const DEFAULT_CONFIG: Required<Omit<SEOConfig, 'structuredData' | 'publishedTime' | 'modifiedTime' | 'author' | 'section' | 'tags' | 'canonical'>> = {
  title: 'Workover - Piattaforma Coworking Professionale',
  description: 'La piattaforma leader per spazi coworking, networking professionale ed eventi. Connettiti con professionisti e scopri spazi produttivi in tutta Italia.',
  keywords: ['coworking', 'spazi lavoro', 'networking', 'uffici condivisi', 'workspace', 'meeting room', 'eventi professionali', 'business center'],
  image: 'https://workover.app/og-image.jpg',
  url: 'https://workover.app',
  type: 'website',
  locale: 'it_IT',
  siteName: 'Workover',
  noIndex: false
};

export const useSEO = (config: SEOConfig = {}) => {
  useEffect(() => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    // Basic meta tags
    document.title = finalConfig.title;
    updateMetaTag('description', finalConfig.description);
    updateMetaTag('keywords', finalConfig.keywords.join(', '));
    
    // Open Graph tags
    updateMetaProperty('og:title', finalConfig.title);
    updateMetaProperty('og:description', finalConfig.description);
    updateMetaProperty('og:image', finalConfig.image);
    updateMetaProperty('og:url', finalConfig.url);
    updateMetaProperty('og:type', finalConfig.type);
    updateMetaProperty('og:locale', finalConfig.locale);
    updateMetaProperty('og:site_name', finalConfig.siteName);
    
    // Twitter tags
    updateMetaName('twitter:card', 'summary_large_image');
    updateMetaName('twitter:title', finalConfig.title);
    updateMetaName('twitter:description', finalConfig.description);
    updateMetaName('twitter:image', finalConfig.image);
    
    // Additional meta tags
    if (config.author) {
      updateMetaName('author', config.author);
    }
    
    if (config.publishedTime) {
      updateMetaProperty('article:published_time', config.publishedTime);
    }
    
    if (config.modifiedTime) {
      updateMetaProperty('article:modified_time', config.modifiedTime);
    }
    
    if (config.section) {
      updateMetaProperty('article:section', config.section);
    }
    
    if (config.tags) {
      config.tags.forEach(tag => {
        updateMetaProperty('article:tag', tag);
      });
    }
    
    // Canonical URL
    if (config.canonical) {
      updateCanonical(config.canonical);
    }
    
    // Robots meta tag
    updateMetaName('robots', finalConfig.noIndex ? 'noindex,nofollow' : 'index,follow');
    
    // Structured data
    if (config.structuredData) {
      updateStructuredData(config.structuredData);
    }
    
  }, [config]);
};

const updateMetaTag = (name: string, content: string) => {
  let element = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
};

const updateMetaName = (name: string, content: string) => {
  let element = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  element.content = content;
};

const updateMetaProperty = (property: string, content: string) => {
  let element = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    document.head.appendChild(element);
  }
  element.content = content;
};

const updateCanonical = (url: string) => {
  let element = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = url;
};

const updateStructuredData = (data: any) => {
  // Remove existing structured data
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

// SEO helper functions
export const generateSpaceSEO = (space: any): SEOConfig => {
  return {
    title: `${space.title} - Spazio Coworking a ${space.location} | Workover`,
    description: `Prenota ${space.title} a ${space.location}. ${space.description?.substring(0, 120)}... Spazio coworking professionale con ${space.amenities?.join(', ')}.`,
    keywords: ['coworking', space.location, 'spazio lavoro', ...(space.amenities || [])],
    image: space.photos?.[0] || DEFAULT_CONFIG.image,
    url: `https://workover.app/spaces/${space.id}`,
    type: 'place',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Place",
      "name": space.title,
      "description": space.description,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": space.location,
        "addressCountry": "IT"
      },
      "priceRange": `€${space.price_per_day}`,
      "amenityFeature": space.amenities?.map((amenity: string) => ({
        "@type": "LocationFeatureSpecification",
        "name": amenity
      })),
      "image": space.photos || [],
      "aggregateRating": space.average_rating ? {
        "@type": "AggregateRating",
        "ratingValue": space.average_rating,
        "bestRating": 5,
        "worstRating": 1
      } : undefined
    }
  };
};

export const generateProfileSEO = (profile: any): SEOConfig => {
  return {
    title: `${profile.first_name} ${profile.last_name} - Profilo Professionale | Workover`,
    description: `Connettiti con ${profile.first_name} ${profile.last_name}${profile.job_title ? `, ${profile.job_title}` : ''} su Workover. ${profile.bio?.substring(0, 120)}...`,
    keywords: ['networking', 'professionista', profile.profession || '', profile.city || ''],
    image: profile.profile_photo_url || DEFAULT_CONFIG.image,
    url: `https://workover.app/profile/${profile.id}`,
    type: 'profile',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": `${profile.first_name} ${profile.last_name}`,
      "description": profile.bio,
      "jobTitle": profile.job_title,
      "worksFor": profile.company ? {
        "@type": "Organization",
        "name": profile.company
      } : undefined,
      "address": profile.city ? {
        "@type": "PostalAddress",
        "addressLocality": profile.city,
        "addressCountry": "IT"
      } : undefined,
      "sameAs": [
        profile.linkedin_url,
        profile.website,
        profile.twitter_url
      ].filter(Boolean)
    }
  };
};

export const generateEventSEO = (event: any): SEOConfig => {
  return {
    title: `${event.title} - Evento Networking | Workover`,
    description: `Partecipa a ${event.title} il ${new Date(event.date).toLocaleDateString('it-IT')}. ${event.description?.substring(0, 120)}...`,
    keywords: ['evento', 'networking', 'coworking', event.city || ''],
    image: event.image_url || DEFAULT_CONFIG.image,
    url: `https://workover.app/events/${event.id}`,
    type: 'article',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": event.title,
      "description": event.description,
      "startDate": event.date,
      "location": {
        "@type": "Place",
        "name": event.location_name,
        "address": event.location_address
      },
      "organizer": {
        "@type": "Organization",
        "name": "Workover"
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock"
      }
    }
  };
};

export default useSEO;