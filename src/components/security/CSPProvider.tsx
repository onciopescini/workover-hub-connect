import React, { useEffect } from 'react';

const CSPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Only set CSP meta tag for dynamic content security
    // Other security headers are handled by nginx in production
    const setCSPForDynamicContent = () => {
      // Remove existing CSP meta tags to avoid conflicts
      const existingCSP = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
      existingCSP.forEach(el => el.remove());

      // Only set essential CSP for dynamic content
      const cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      cspMeta.content = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' 
          https://cdn.jsdelivr.net 
          https://unpkg.com 
          https://js.stripe.com 
          https://maps.googleapis.com 
          https://www.googletagmanager.com 
          https://www.google-analytics.com
          https://plausible.io
          https://cdn.gpteng.co;
        style-src 'self' 'unsafe-inline' 
          https://fonts.googleapis.com 
          https://cdn.jsdelivr.net
          https://unpkg.com;
        font-src 'self' 
          https://fonts.gstatic.com 
          https://cdn.jsdelivr.net
          data:;
        img-src 'self' data: https: blob:
          https://images.unsplash.com
          https://via.placeholder.com
          https://www.google-analytics.com
          https://stats.g.doubleclick.net;
        connect-src 'self' 
          https://khtqwzvrxzsgfhsslwyz.supabase.co 
          wss://khtqwzvrxzsgfhsslwyz.supabase.co
          https://api.stripe.com
          https://maps.googleapis.com
          https://www.google-analytics.com
          https://stats.g.doubleclick.net
          https://plausible.io;
        media-src 'self' https: blob:;
        worker-src 'self' blob:;
        child-src 'self' https://js.stripe.com;
        frame-src 'self' https://js.stripe.com https://www.google.com;
        object-src 'none';
        base-uri 'self';
        form-action 'self' https://khtqwzvrxzsgfhsslwyz.supabase.co;
        manifest-src 'self';
        upgrade-insecure-requests;
      `.replace(/\s+/g, ' ').trim();
      
      document.head.appendChild(cspMeta);
    };

    // Security event listeners
    const setupSecurityEventListeners = () => {
      // Detect and log CSP violations
      document.addEventListener('securitypolicyviolation', (e) => {
        console.warn('CSP Violation:', {
          blockedURI: e.blockedURI,
          violatedDirective: e.violatedDirective,
          originalPolicy: e.originalPolicy,
          sourceFile: e.sourceFile,
          lineNumber: e.lineNumber
        });
      });

      // Prevent clipboard access from unauthorized sources
      document.addEventListener('paste', (e) => {
        const activeElement = document.activeElement;
        const allowedElements = ['input', 'textarea'];
        const isAllowedElement = allowedElements.includes(activeElement?.tagName.toLowerCase() || '');
        
        if (!isAllowedElement) {
          e.preventDefault();
          console.warn('Unauthorized paste attempt blocked');
        }
      });

      // Monitor for suspicious DOM modifications
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                
                // Check for suspicious script injections
                if (element.tagName === 'SCRIPT' && !element.hasAttribute('data-approved')) {
                  console.warn('Suspicious script injection detected:', element);
                  element.remove();
                }
                
                // Check for suspicious iframe injections
                if (element.tagName === 'IFRAME' && !element.hasAttribute('data-approved')) {
                  console.warn('Suspicious iframe injection detected:', element);
                  element.remove();
                }
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Cleanup observer on unmount
      return () => observer.disconnect();
    };

    setCSPForDynamicContent();
    const cleanup = setupSecurityEventListeners();

    return cleanup;
  }, []);

  return <>{children}</>;
};

export { CSPProvider };