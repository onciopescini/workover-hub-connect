
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, Users, MapPin, Calendar } from "lucide-react";
import { useNetworking } from "@/hooks/useNetworking";
import { SuggestionCard } from "@/components/networking/SuggestionCard";
import LoadingScreen from "@/components/LoadingScreen";
import { useNavigate } from "react-router-dom";

export default function NetworkingDiscover() {
  const navigate = useNavigate();
  const { suggestions, isLoading, refreshSuggestions } = useNetworking();

  const handleRefresh = async () => {
    await refreshSuggestions();
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/networking")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-600" />
                  Scopri Coworker
                </h1>
                <p className="text-gray-600 mt-1">
                  Trova persone con cui hai condiviso spazi ed eventi
                </p>
              </div>
            </div>
            <Button 
              onClick={handleRefresh}
              variant="outline"
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Aggiorna
            </Button>
          </div>

          {suggestions.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {suggestions.length} suggerimenti disponibili
              </Badge>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">Spazi Condivisi</span>
            </div>
            <p className="text-sm text-blue-700">
              Connettiti con coworker che hanno lavorato negli stessi spazi negli ultimi 3 mesi
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">Eventi Condivisi</span>
            </div>
            <p className="text-sm text-green-700">
              Trova persone che hanno partecipato agli stessi eventi che hai frequentato
            </p>
          </div>
        </div>

        {/* Suggestions */}
        {suggestions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nessun suggerimento disponibile
            </h3>
            <p className="text-gray-600 mb-4">
              Partecipa a più spazi ed eventi per ricevere suggerimenti di connessione personalizzati
            </p>
            <Button 
              onClick={handleRefresh}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Controlla di nuovo
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {suggestions.map((suggestion) => (
              <SuggestionCard 
                key={suggestion.id} 
                suggestion={suggestion} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
