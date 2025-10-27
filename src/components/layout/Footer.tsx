
import React from "react";
import { Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Footer() {
  const navigate = useNavigate();
  return (
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
              <li><button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">Contatti</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Legale</h4>
            <ul className="space-y-2 text-gray-400">
              <li><button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Termini di servizio</button></li>
              <li><button onClick={() => navigate('/privacy-policy')} className="hover:text-white transition-colors">Privacy Policy</button></li>
              <li><button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Centro Privacy</button></li>
              <li><button onClick={() => navigate('/support')} className="hover:text-white transition-colors">Supporto</button></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8">
          {/* Company Data Section */}
          <div className="text-center mb-6">
            <h4 className="text-white font-semibold mb-3">Workover S.r.l.</h4>
            <div className="text-gray-400 text-sm space-y-1">
              <p>P.IVA: 12345678901 | REA MI-1234567</p>
              <p>Sede Legale: Via Roma 123, 20121 Milano, Italia</p>
              <p>Capitale Sociale: € 10.000,00 i.v.</p>
              <div className="mt-2">
                <a href="mailto:info@workover.it" className="hover:text-white transition-colors">
                  info@workover.it
                </a>
                {' | '}
                <a href="mailto:workover@pec.workover.it" className="hover:text-white transition-colors">
                  PEC
                </a>
              </div>
            </div>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-4 mb-6 text-sm">
            <button 
              onClick={() => navigate('/privacy-policy')} 
              className="text-gray-400 hover:text-white transition-colors"
            >
              Privacy Policy
            </button>
            <span className="text-gray-600">|</span>
            <button 
              onClick={() => navigate('/terms')} 
              className="text-gray-400 hover:text-white transition-colors"
            >
              Termini di Servizio
            </button>
            <span className="text-gray-600">|</span>
            <button 
              onClick={() => navigate('/privacy')} 
              className="text-gray-400 hover:text-white transition-colors"
            >
              Centro Privacy
            </button>
            <span className="text-gray-600">|</span>
            <button 
              onClick={() => navigate('/support')} 
              className="text-gray-400 hover:text-white transition-colors"
            >
              Supporto
            </button>
          </div>

          {/* Copyright */}
          <div className="text-center text-gray-400 text-sm">
            <p>&copy; 2025 Workover S.r.l. - Tutti i diritti riservati.</p>
            <p className="text-xs text-gray-500 mt-2">
              Dati aziendali fittizi utilizzati a scopo dimostrativo
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
