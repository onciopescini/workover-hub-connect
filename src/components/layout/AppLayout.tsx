
import React from 'react';
import { AppNavbar } from './AppNavbar';
import { QuickNavigation } from './QuickNavigation';
import { AppFooter } from './AppFooter';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  customBackUrl?: string;
}

export function AppLayout({ 
  children, 
  title, 
  subtitle, 
  showBackButton = true, 
  customBackUrl 
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <AppNavbar 
        title={title}
        subtitle={subtitle}
        showBackButton={showBackButton}
        customBackUrl={customBackUrl}
      />

      {/* Quick Navigation Bar (Only for hosts and admins) */}
      <QuickNavigation />

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer - Always visible */}
      <AppFooter />
    </div>
  );
}
