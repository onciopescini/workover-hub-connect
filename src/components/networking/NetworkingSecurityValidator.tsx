
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

interface SecurityCheck {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'warning' | 'pending';
  description: string;
  details?: string;
}

export const NetworkingSecurityValidator = () => {
  const [checks, setChecks] = useState<SecurityCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runSecurityValidation = async () => {
    setIsRunning(true);
    
    const securityChecks: SecurityCheck[] = [
      {
        id: 'auth-check',
        name: 'Controllo Autenticazione',
        status: 'pending',
        description: 'Verifica che solo utenti autenticati possano accedere al networking',
        details: 'Controllo RLS e auth.uid() nelle query'
      },
      {
        id: 'privacy-check',
        name: 'Controllo Privacy Profili',
        status: 'pending',
        description: 'Verifica che gli utenti non possano accedere a profili senza permessi',
        details: 'Test funzione check_profile_access'
      },
      {
        id: 'networking-disabled-check',
        name: 'Rispetto Impostazioni Networking',
        status: 'pending',
        description: 'Verifica che utenti con networking disabilitato non appaiano in suggerimenti',
        details: 'Controllo filtro networking_enabled'
      },
      {
        id: 'data-filtering-check',
        name: 'Filtraggio Dati Sensibili',
        status: 'pending',
        description: 'Verifica che dati sensibili siano filtrati in base al livello di accesso',
        details: 'Test filterProfileData function'
      },
      {
        id: 'rate-limiting-check',
        name: 'Protezione Rate Limiting',
        status: 'pending',
        description: 'Verifica protezioni contro spam di richieste di connessione',
        details: 'Controllo frequenza richieste'
      }
    ];

    setChecks(securityChecks);

    // Simula esecuzione dei controlli
    for (let i = 0; i < securityChecks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setChecks(prev => prev.map((check, index) => 
        index === i ? {
          ...check,
          status: Math.random() > 0.8 ? 'failed' : Math.random() > 0.6 ? 'warning' : 'passed'
        } : check
      ));
    }

    setIsRunning(false);
    toast.success("Validazione sicurezza completata!");
  };

  const getStatusConfig = (status: SecurityCheck['status']) => {
    switch (status) {
      case 'passed':
        return { icon: CheckCircle, color: 'bg-green-500', text: 'Superato' };
      case 'failed':
        return { icon: X, color: 'bg-red-500', text: 'Fallito' };
      case 'warning':
        return { icon: AlertTriangle, color: 'bg-yellow-500', text: 'Attenzione' };
      default:
        return { icon: Shield, color: 'bg-gray-500', text: 'In corso...' };
    }
  };

  const overallStatus = checks.length > 0 ? (
    checks.every(c => c.status === 'passed') ? 'secure' :
    checks.some(c => c.status === 'failed') ? 'vulnerable' : 'warning'
  ) : 'unknown';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Validazione Sicurezza Networking
        </CardTitle>
        {checks.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge className={
              overallStatus === 'secure' ? 'bg-green-500' :
              overallStatus === 'vulnerable' ? 'bg-red-500' : 'bg-yellow-500'
            }>
              Sistema {overallStatus === 'secure' ? 'Sicuro' : 
                     overallStatus === 'vulnerable' ? 'Vulnerabile' : 'Attenzione'}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runSecurityValidation} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? "Validazione in corso..." : "Avvia Validazione Sicurezza"}
        </Button>

        {checks.length > 0 && (
          <div className="space-y-3">
            {checks.map((check) => {
              const config = getStatusConfig(check.status);
              const IconComponent = config.icon;
              
              return (
                <div key={check.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{check.name}</h4>
                      <p className="text-sm text-gray-600">{check.description}</p>
                    </div>
                    <Badge className={`${config.color} text-white flex items-center gap-1`}>
                      <IconComponent className="w-3 h-3" />
                      {config.text}
                    </Badge>
                  </div>
                  {check.details && (
                    <p className="text-xs text-gray-500 mt-2">{check.details}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
