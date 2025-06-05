
import React from 'react';
import { CookieConsentManager } from './CookieConsentManager';

interface GDPRProviderProps {
  children: React.ReactNode;
}

export function GDPRProvider({ children }: GDPRProviderProps) {
  return (
    <>
      {children}
      <CookieConsentManager />
    </>
  );
}
