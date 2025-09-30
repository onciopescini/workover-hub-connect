
import React from 'react';
import { Outlet } from 'react-router-dom';
import { OptimizedUnifiedHeader } from './OptimizedUnifiedHeader';
import { Footer } from './Footer';
import { CookieConsentBanner } from '@/components/gdpr/CookieConsentBanner';
import OnboardingBanner from '@/components/auth/OnboardingBanner';

export function MainLayout() {
  return (
    <div className="h-screen bg-gray-50 w-full flex flex-col overflow-hidden">
      <OptimizedUnifiedHeader />
      {/* Banner onboarding globale */}
      <OnboardingBanner />
      <main className="w-full flex-1 overflow-hidden">
        <div className="w-full h-full">
          <Outlet />
        </div>
      </main>
      <Footer />
      <CookieConsentBanner />
    </div>
  );
}
