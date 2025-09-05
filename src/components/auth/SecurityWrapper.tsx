import React, { useEffect, useState } from 'react';
import { SecurityBanner } from '@/components/ui/security-banner';
import { SecurityAlert } from '@/components/security/SecurityAlert';
import { useSecurity } from '@/hooks/useSecurity';

interface SecurityWrapperProps {
  children: React.ReactNode;
}

export const SecurityWrapper: React.FC<SecurityWrapperProps> = ({ children }) => {
  const [securityAlerts, setSecurityAlerts] = useState<Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    message: string;
  }>>([]);

  const dismissAlert = (id: string) => {
    setSecurityAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  // Check for common security issues
  useEffect(() => {
    const checkSecurityStatus = async () => {
      // Check if we're on HTTPS in production
      if (process.env['NODE_ENV'] === 'production' && window.location.protocol !== 'https:') {
        setSecurityAlerts(prev => [...prev, {
          id: 'insecure-connection',
          type: 'error',
          title: 'Connessione non sicura',
          message: 'La tua connessione non è sicura. Ti consigliamo di utilizzare HTTPS.'
        }]);
      }

      // Check for outdated browser
      const isModernBrowser = 'fetch' in window && 'Promise' in window && 'crypto' in window;
      if (!isModernBrowser) {
        setSecurityAlerts(prev => [...prev, {
          id: 'outdated-browser',
          type: 'warning',
          title: 'Browser obsoleto',
          message: 'Il tuo browser potrebbe non supportare tutte le funzionalità di sicurezza. Ti consigliamo di aggiornarlo.'
        }]);
      }
    };

    checkSecurityStatus();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Security Banner for general info */}
      <SecurityBanner
        message="I tuoi dati sono protetti con crittografia end-to-end e politiche di sicurezza avanzate."
        type="info"
        dismissible={true}
        persistent={false}
      />

      {/* Security Alerts */}
      {securityAlerts.map(alert => (
        <SecurityAlert
          key={alert.id}
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onDismiss={() => dismissAlert(alert.id)}
        />
      ))}

      {children}
    </div>
  );
};