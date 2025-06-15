import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Building2 } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedHeader } from './UnifiedHeader';
import { Footer } from './Footer';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { authState } = useAuth();

  const isActivePath = (path: string) => location.pathname === path;

  // If user is authenticated, use UnifiedHeader
  if (authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <UnifiedHeader />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  // For non-authenticated users, show the original static header
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Workover</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Button
                variant={isActivePath('/spaces') ? 'default' : 'ghost'}
                onClick={() => navigate('/spaces')}
                className={isActivePath('/spaces') ? 'bg-indigo-600 text-white' : ''}
              >
                Spazi
              </Button>
              
              <Button
                variant={isActivePath('/events') ? 'default' : 'ghost'}
                onClick={() => navigate('/events')}
                className={isActivePath('/events') ? 'bg-indigo-600 text-white' : ''}
              >
                Eventi
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    Altro <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/about')}>
                    Chi siamo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/faq')}>
                    FAQ
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/terms')}>
                    Termini di servizio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/privacy')}>
                    Privacy Policy
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* Auth buttons */}
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              >
                Accedi
              </Button>
              <Button
                onClick={() => navigate('/signup')}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Registrati
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
