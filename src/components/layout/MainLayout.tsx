
import React from 'react';
import { Outlet } from 'react-router-dom';
import { OptimizedUnifiedHeader } from './OptimizedUnifiedHeader';
import { AppSidebar } from './AppSidebar';
import { Footer } from './Footer';
import { CookieConsentBanner } from '@/components/gdpr/CookieConsentBanner';
import OnboardingBanner from '@/components/auth/OnboardingBanner';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/auth/useAuth';

export function MainLayout() {
  const { authState } = useAuth();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-gray-50 w-full flex">
        {/* Show sidebar only for authenticated users */}
        {authState.isAuthenticated && <AppSidebar />}
        
        <div className="flex-1 flex flex-col w-full">
          <OptimizedUnifiedHeader />
          <OnboardingBanner />
          
          <main className="flex-1 w-full">
            <Outlet />
          </main>
          
          <Footer />
        </div>
      </div>
      <CookieConsentBanner />
    </SidebarProvider>
  );
}
