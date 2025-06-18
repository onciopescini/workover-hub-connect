
import React from 'react';
import { AlertTriangle, RefreshCw, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ConflictHandlerProps {
  hasConflict: boolean;
  conflictDetails?: any[];
  onRefresh?: () => void;
  onTimeChange?: () => void;
  loading?: boolean;
  alternativeSuggestions?: string[];
}

export const ConflictHandler: React.FC<ConflictHandlerProps> = ({
  hasConflict,
  conflictDetails,
  onRefresh,
  onTimeChange,
  loading = false,
  alternativeSuggestions = []
}) => {
  if (!hasConflict) return null;

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="font-medium text-red-800">Orario non disponibile</h4>
              <p className="text-sm text-red-700 mt-1">
                Questo slot è stato prenotato da un altro utente. Seleziona un orario diverso.
              </p>
            </div>

            {conflictDetails && conflictDetails.length > 0 && (
              <div className="bg-red-100 rounded p-2">
                <p className="text-xs font-medium text-red-800 mb-1">Conflitti rilevati:</p>
                <div className="space-y-1">
                  {conflictDetails.map((conflict, index) => (
                    <div key={conflict.id || index} className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-red-600" />
                      <span className="text-xs text-red-700">
                        {conflict.start_time} - {conflict.end_time}
                      </span>
                      <Badge variant="destructive" className="text-xs h-4">
                        {conflict.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alternativeSuggestions.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <div className="flex items-start gap-2">
                  <Info className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-800 mb-1">
                      Orari alternativi disponibili:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {alternativeSuggestions.map((suggestion, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-blue-100"
                          onClick={onTimeChange}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={loading}
                  className="h-8 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Aggiorna disponibilità
                </Button>
              )}
              {onTimeChange && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onTimeChange}
                  className="h-8 text-xs"
                >
                  Scegli altro orario
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
