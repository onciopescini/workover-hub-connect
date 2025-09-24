import React, { useEffect } from 'react';

const CSPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Enhanced Content Security Policy
    const setAdvancedSecurityHeaders = () => {
      // Remove existing CSP meta tags to avoid conflicts
      const existingCSP = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
      existingCSP.forEach(el => el.remove());

      // Advanced Content Security Policy
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
          https://plausible.io;
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
        frame-ancestors 'none';
        manifest-src 'self';
        upgrade-insecure-requests;
      `.replace(/\s+/g, ' ').trim();
      
      document.head.appendChild(cspMeta);

      // X-Content-Type-Options
      const noSniffMeta = document.createElement('meta');
      noSniffMeta.httpEquiv = 'X-Content-Type-Options';
      noSniffMeta.content = 'nosniff';
      document.head.appendChild(noSniffMeta);

      // X-Frame-Options
      const frameOptionsMeta = document.createElement('meta');
      frameOptionsMeta.httpEquiv = 'X-Frame-Options';
      frameOptionsMeta.content = 'DENY';
      document.head.appendChild(frameOptionsMeta);

      // X-XSS-Protection
      const xssProtectionMeta = document.createElement('meta');
      xssProtectionMeta.httpEquiv = 'X-XSS-Protection';
      xssProtectionMeta.content = '1; mode=block';
      document.head.appendChild(xssProtectionMeta);

      // Referrer Policy
      const referrerPolicyMeta = document.createElement('meta');
      referrerPolicyMeta.name = 'referrer';
      referrerPolicyMeta.content = 'strict-origin-when-cross-origin';
      document.head.appendChild(referrerPolicyMeta);

      // Enhanced Permissions Policy
      const permissionsPolicyMeta = document.createElement('meta');
      permissionsPolicyMeta.httpEquiv = 'Permissions-Policy';
      permissionsPolicyMeta.content = [
        'accelerometer=()',
        'ambient-light-sensor=()',
        'autoplay=()',
        'battery=()',
        'camera=()',
        'cross-origin-isolated=()',
        'display-capture=()',
        'document-domain=()',
        'encrypted-media=()',
        'execution-while-not-rendered=()',
        'execution-while-out-of-viewport=()',
        'fullscreen=(self)',
        'geolocation=()',
        'gyroscope=()',
        'keyboard-map=()',
        'magnetometer=()',
        'microphone=()',
        'midi=()',
        'navigation-override=()',
        'payment=(self)',
        'picture-in-picture=()',
        'publickey-credentials-get=()',
        'screen-wake-lock=()',
        'sync-xhr=()',
        'usb=()',
        'web-share=()',
        'xr-spatial-tracking=()'
      ].join(', ');
      document.head.appendChild(permissionsPolicyMeta);

      // Cross-Origin-Embedder-Policy
      const coepMeta = document.createElement('meta');
      coepMeta.httpEquiv = 'Cross-Origin-Embedder-Policy';
      coepMeta.content = 'unsafe-none';
      document.head.appendChild(coepMeta);

      // Cross-Origin-Opener-Policy
      const coopMeta = document.createElement('meta');
      coopMeta.httpEquiv = 'Cross-Origin-Opener-Policy';
      coopMeta.content = 'same-origin-allow-popups';
      document.head.appendChild(coopMeta);

      // Cross-Origin-Resource-Policy
      const corpMeta = document.createElement('meta');
      corpMeta.httpEquiv = 'Cross-Origin-Resource-Policy';
      corpMeta.content = 'cross-origin';
      document.head.appendChild(corpMeta);

      // Strict-Transport-Security (HSTS)
      const hstsMeta = document.createElement('meta');
      hstsMeta.httpEquiv = 'Strict-Transport-Security';
      hstsMeta.content = 'max-age=31536000; includeSubDomains; preload';
      document.head.appendChild(hstsMeta);
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

    setAdvancedSecurityHeaders();
    const cleanup = setupSecurityEventListeners();

    return cleanup;
  }, []);

  return <>{children}</>;
};

export { CSPProvider };