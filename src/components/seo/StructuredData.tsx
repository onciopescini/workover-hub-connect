import React from 'react';
import { Helmet } from 'react-helmet-async';

// Organization Schema
export const OrganizationSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Workover",
    "description": "Piattaforma leader per spazi coworking, networking professionale ed eventi in Italia",
    "url": "https://workover.app",
    "logo": "https://workover.app/logo.png",
    "foundingDate": "2024",
    "founders": [{
      "@type": "Person",
      "name": "Workover Team"
    }],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IT",
      "addressRegion": "Italia"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+39-XXX-XXXXXXX",
      "contactType": "customer service",
      "email": "support@workover.app",
      "availableLanguage": ["Italian", "English"]
    },
    "sameAs": [
      "https://www.linkedin.com/company/workover",
      "https://twitter.com/workover_app",
      "https://www.instagram.com/workover_app"
    ],
    "serviceType": "Coworking Space Platform",
    "areaServed": {
      "@type": "Country",
      "name": "Italy"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// Website Schema
export const WebsiteSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Workover",
    "url": "https://workover.app",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://workover.app/spaces?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Workover",
      "logo": "https://workover.app/logo.png"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// Breadcrumb Schema
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export const BreadcrumbSchema: React.FC<BreadcrumbSchemaProps> = ({ items }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// FAQ Schema
interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  faqs: FAQItem[];
}

export const FAQSchema: React.FC<FAQSchemaProps> = ({ faqs }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// Local Business Schema for Coworking Spaces
interface LocalBusinessSchemaProps {
  space: {
    id: string;
    title: string;
    description: string;
    address: string;
    city: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
    website?: string;
    price_per_day: number;
    photos: string[];
    amenities: string[];
    average_rating?: number;
    reviews_count?: number;
    opening_hours?: Array<{
      day: string;
      open: string;
      close: string;
    }>;
  };
}

export const LocalBusinessSchema: React.FC<LocalBusinessSchemaProps> = ({ space }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `https://workover.app/spaces/${space.id}`,
    "name": space.title,
    "description": space.description,
    "image": space.photos,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": space.address,
      "addressLocality": space.city,
      "addressCountry": "IT"
    },
    ...(space.latitude && space.longitude && {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": space.latitude,
        "longitude": space.longitude
      }
    }),
    ...(space.phone && { "telephone": space.phone }),
    ...(space.email && { "email": space.email }),
    ...(space.website && { "url": space.website }),
    "priceRange": `€${space.price_per_day}`,
    "category": "Coworking Space",
    "amenityFeature": space.amenities.map(amenity => ({
      "@type": "LocationFeatureSpecification",
      "name": amenity
    })),
    ...(space.average_rating && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": space.average_rating,
        "reviewCount": space.reviews_count || 0,
        "bestRating": 5,
        "worstRating": 1
      }
    }),
    ...(space.opening_hours && {
      "openingHoursSpecification": space.opening_hours.map(hours => ({
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": `https://schema.org/${hours.day}`,
        "opens": hours.open,
        "closes": hours.close
      }))
    }),
    "potentialAction": {
      "@type": "ReserveAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `https://workover.app/spaces/${space.id}/book`
      },
      "result": {
        "@type": "Reservation"
      }
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// Article Schema for Blog Posts
interface ArticleSchemaProps {
  article: {
    title: string;
    description: string;
    content: string;
    publishedDate: string;
    modifiedDate?: string;
    author: {
      name: string;
      url?: string;
    };
    image: string[];
    url: string;
    category: string;
    tags: string[];
  };
}

export const ArticleSchema: React.FC<ArticleSchemaProps> = ({ article }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.description,
    "image": article.image,
    "url": article.url,
    "datePublished": article.publishedDate,
    "dateModified": article.modifiedDate || article.publishedDate,
    "author": {
      "@type": "Person",
      "name": article.author.name,
      ...(article.author.url && { "url": article.author.url })
    },
    "publisher": {
      "@type": "Organization",
      "name": "Workover",
      "logo": {
        "@type": "ImageObject",
        "url": "https://workover.app/logo.png"
      }
    },
    "articleSection": article.category,
    "keywords": article.tags.join(", "),
    "wordCount": article.content.split(' ').length,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": article.url
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};