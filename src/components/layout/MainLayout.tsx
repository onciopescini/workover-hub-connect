
import React from 'react';
import { UnifiedHeader } from './UnifiedHeader';
import { CookieConsentBanner } from '@/components/gdpr/CookieConsentBanner';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <UnifiedHeader />
      <main className="w-full">
        {(title || subtitle) && (
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {title && (
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              )}
              {subtitle && (
                <p className="mt-1 text-gray-600">{subtitle}</p>
              )}
            </div>
          </div>
        )}
        <div className="w-full">
          {children}
        </div>
      </main>
      <CookieConsentBanner />
    </div>
  );
}
