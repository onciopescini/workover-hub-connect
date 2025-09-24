import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
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
  noIndex?: boolean;
  canonical?: string;
  structuredData?: any;
  locale?: string;
}

const DEFAULT_CONFIG = {
  title: 'Workover - Piattaforma Coworking Professionale',
  description: 'La piattaforma leader per spazi coworking, networking professionale ed eventi. Connettiti con professionisti e scopri spazi produttivi in tutta Italia.',
  keywords: ['coworking', 'spazi lavoro', 'networking', 'uffici condivisi', 'workspace', 'meeting room', 'eventi professionali', 'business center'],
  image: 'https://workover.app/og-image.jpg',
  url: 'https://workover.app',
  type: 'website' as const,
  locale: 'it_IT',
  siteName: 'Workover'
};

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords = DEFAULT_CONFIG.keywords,
  image = DEFAULT_CONFIG.image,
  url = DEFAULT_CONFIG.url,
  type = DEFAULT_CONFIG.type,
  author,
  publishedTime,
  modifiedTime,
  section,
  tags,
  noIndex = false,
  canonical,
  structuredData,
  locale = DEFAULT_CONFIG.locale
}) => {
  const finalTitle = title || DEFAULT_CONFIG.title;
  const finalDescription = description || DEFAULT_CONFIG.description;
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={keywords.join(', ')} />
      {author && <meta name="author" content={author} />}
      
      {/* Robots */}
      <meta name="robots" content={noIndex ? 'noindex,nofollow' : 'index,follow'} />
      
      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content={locale} />
      <meta property="og:site_name" content={DEFAULT_CONFIG.siteName} />
      
      {/* Article specific */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {section && <meta property="article:section" content={section} />}
      {tags && tags.map(tag => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={image} />
      
      {/* Mobile optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Theme colors */}
      <meta name="theme-color" content="#3b82f6" />
      <meta name="msapplication-TileColor" content="#3b82f6" />
      
      {/* Language */}
      <html lang="it" />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;