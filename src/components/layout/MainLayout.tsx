
import React from 'react';
import { Outlet } from 'react-router-dom';
import { OptimizedUnifiedHeader } from './OptimizedUnifiedHeader';
import { Footer } from './Footer';
import { CookieConsentBanner } from '@/components/gdpr/CookieConsentBanner';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50 w-full flex flex-col">
      <OptimizedUnifiedHeader />
      <main className="w-full flex-1">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
      <Footer />
      <CookieConsentBanner />
    </div>
  );
}
