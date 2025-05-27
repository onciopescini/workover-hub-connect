
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getConnectionSuggestions, sendConnectionRequest, generateSuggestions } from "@/lib/networking-utils";
import { ConnectionSuggestion } from "@/types/networking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, UserPlus, RefreshCw, MapPin, Calendar, Heart } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

export function ConnectionSuggestions() {
  const { authState } = useAuth();
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSuggestions();
  }, [authState.user]);

  const loadSuggestions = async () => {
    if (!authState.user) return;
    
    try {
      setIsLoading(true);
      const data = await getConnectionSuggestions();
      setSuggestions(data);
    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    setIsGenerating(true);
    try {
      await generateSuggestions();
      await loadSuggestions();
    } catch (error) {
      console.error("Error generating suggestions:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    const success = await sendConnectionRequest(userId);
    if (success) {
      setSentRequests(prev => new Set([...prev, userId]));
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'shared_space':
        return <MapPin className="w-4 h-4" />;
      case 'shared_event':
        return <Calendar className="w-4 h-4" />;
      case 'similar_interests':
        return <Heart className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getReasonText = (reason: string, context: any) => {
    switch (reason) {
      case 'shared_space':
        return `Avete frequentato lo stesso spazio: ${context?.space_name || 'Spazio condiviso'}`;
      case 'shared_event':
        return `Avete partecipato allo stesso evento: ${context?.event_name || 'Evento condiviso'}`;
      case 'similar_interests':
        return 'Avete interessi simili';
      default:
        return 'Suggerimento basato sul profilo';
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Persone che Potresti Conoscere
          </CardTitle>
          
          <Button
            onClick={handleGenerateSuggestions}
            disabled={isGenerating}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generando...' : 'Aggiorna'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessun suggerimento disponibile
            </h3>
            <p className="text-gray-600 mb-4">
              Prova a generare nuovi suggerimenti o partecipa a più eventi e spazi
            </p>
            <Button onClick={handleGenerateSuggestions} disabled={isGenerating}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              Genera Suggerimenti
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((suggestion) => {
              const user = suggestion.suggested_user;
              if (!user) return null;

              const isRequestSent = sentRequests.has(user.id);

              return (
                <div key={suggestion.id} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Avatar>
                      <AvatarImage src={user.profile_photo_url || undefined} />
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">
                        {user.first_name} {user.last_name}
                      </h4>
                      {user.bio && (
                        <p className="text-sm text-gray-600 truncate">{user.bio}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <Badge variant="secondary" className="text-xs">
                      <span className="mr-1">{getReasonIcon(suggestion.reason)}</span>
                      {getReasonText(suggestion.reason, suggestion.shared_context)}
                    </Badge>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Compatibilità</span>
                      <span className="font-medium">{Math.round(suggestion.score * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full" 
                        style={{ width: `${suggestion.score * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleSendRequest(user.id)}
                    disabled={isRequestSent}
                    size="sm"
                    className="w-full"
                  >
                    {isRequestSent ? (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Richiesta Inviata
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Connetti
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
