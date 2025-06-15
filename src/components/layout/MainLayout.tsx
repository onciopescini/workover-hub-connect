
import React from 'react';
import { Outlet } from 'react-router-dom';
import { UnifiedHeader } from './UnifiedHeader';
import { CookieConsentBanner } from '@/components/gdpr/CookieConsentBanner';

// Non serve più la prop children, né title/subtitle per ora
export function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <UnifiedHeader />
      <main className="w-full">
        {/* Intestazioni opzionali rimosse, si possono ripristinare se necessario */}
        <div className="w-full">
          <Outlet />
        </div>
      </main>
      <CookieConsentBanner />
    </div>
  );
}
