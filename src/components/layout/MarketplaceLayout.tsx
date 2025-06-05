
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UnifiedHeader } from './UnifiedHeader';

interface MarketplaceLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

export function MarketplaceLayout({ children, showFooter = true }: MarketplaceLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <UnifiedHeader />
      <main className="flex-1">
        {children}
      </main>
      
      {/* Footer - only show when explicitly requested */}
      {showFooter && (
        <footer className="bg-gray-900 py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">W</span>
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
                  <li><button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">Contatti</button></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-4">Legale</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Termini di servizio</button></li>
                  <li><button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy Policy</button></li>
                  <li><button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">Supporto</button></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
              <p>&copy; 2024 Workover. Tutti i diritti riservati.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
