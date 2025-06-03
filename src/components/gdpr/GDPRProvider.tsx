
import React from 'react';
import { CookieConsentBanner } from './CookieConsentBanner';

interface GDPRProviderProps {
  children: React.ReactNode;
}

export function GDPRProvider({ children }: GDPRProviderProps) {
  return (
    <>
      {children}
      <CookieConsentBanner />
    </>
  );
}
