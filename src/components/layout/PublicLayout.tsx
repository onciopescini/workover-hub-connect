
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

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActivePath = (path: string) => location.pathname === path;

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
      <footer className="bg-gray-900 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Workover</span>
              </div>
              <p className="text-gray-400 max-w-md">
                La piattaforma che connette professionisti e spazi di lavoro flessibili 
                per un futuro del lavoro più dinamico e collaborativo.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Azienda</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => navigate('/about')} className="hover:text-white transition-colors">Chi siamo</button></li>
                <li><button onClick={() => navigate('/faq')} className="hover:text-white transition-colors">FAQ</button></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contatti</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Legale</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Termini di servizio</button></li>
                <li><button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy Policy</button></li>
                <li><a href="#" className="hover:text-white transition-colors">Supporto</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Workover. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
