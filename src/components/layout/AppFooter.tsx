
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function AppFooter() {
  const { authState } = useAuth();
  const navigate = useNavigate();

  const getUserFullName = () => {
    const firstName = authState.profile?.first_name || "";
    const lastName = authState.profile?.last_name || "";
    return `${firstName} ${lastName}`.trim() || "Utente";
  };

  return (
    <footer className="bg-white border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Workover</h3>
            <p className="text-xs text-gray-600">
              La piattaforma per coworking e networking professionale
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Link Utili</h4>
            <ul className="space-y-1">
              <li>
                <button 
                  onClick={() => navigate("/support")}
                  className="text-xs text-gray-600 hover:text-gray-900"
                >
                  Supporto
                </button>
              </li>
              {authState.profile?.role === "coworker" && (
                <li>
                  <button 
                    onClick={() => navigate("/networking")}
                    className="text-xs text-gray-600 hover:text-gray-900"
                  >
                    Networking
                  </button>
                </li>
              )}
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Account</h4>
            <ul className="space-y-1">
              <li>
                <span className="text-xs text-gray-600">
                  {getUserFullName()}
                </span>
              </li>
              <li>
                <Badge variant="outline" className="text-xs">
                  {authState.profile?.role}
                </Badge>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t pt-4 mt-6">
          <p className="text-xs text-gray-500 text-center">
            © {new Date().getFullYear()} Workover. Tutti i diritti riservati.
          </p>
        </div>
      </div>
    </footer>
  );
}
