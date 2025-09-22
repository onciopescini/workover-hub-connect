import React, { useEffect } from 'react';

interface CSPProviderProps {
  children: React.ReactNode;
}

/**
 * Content Security Policy Provider - Adds CSP meta tags to prevent XSS
 */
export const CSPProvider: React.FC<CSPProviderProps> = ({ children }) => {
  useEffect(() => {
    // Create CSP meta tag if it doesn't exist
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    
    if (!existingCSP) {
      const cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      cspMeta.content = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com https://js.stripe.com",
        "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://plausible.io https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'"
        ].join('; ');
      
      document.head.appendChild(cspMeta);
    }

    // Also set X-Content-Type-Options to prevent MIME sniffing
    const xContentType = document.createElement('meta');
    xContentType.httpEquiv = 'X-Content-Type-Options';
    xContentType.content = 'nosniff';
    document.head.appendChild(xContentType);


    return () => {
      // Cleanup is optional since meta tags are typically persistent
    };
  }, []);

  return <>{children}</>;
};