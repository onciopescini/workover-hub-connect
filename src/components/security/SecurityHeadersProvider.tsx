import { useEffect } from 'react';

/**
 * SecurityHeadersProvider component
 * Injects Content Security Policy meta tag dynamically
 * Note: Most security headers are set at Edge Function level
 */
export const SecurityHeadersProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Check if CSP meta tag already exists
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (existingCSP) return;

    // Create and inject CSP meta tag
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' data: https: blob:;
      font-src 'self' data: https://fonts.gstatic.com;
      connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://api.mapbox.com;
      frame-src https://js.stripe.com https://checkout.stripe.com;
      manifest-src 'self' data:;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
    `.replace(/\s+/g, ' ').trim();

    document.head.appendChild(meta);

    // Cleanup on unmount
    return () => {
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (cspMeta) {
        document.head.removeChild(cspMeta);
      }
    };
  }, []);

  return <>{children}</>;
};
