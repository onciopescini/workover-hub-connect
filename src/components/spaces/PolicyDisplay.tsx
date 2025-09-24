import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InfoIcon, Shield, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface PolicyDisplayProps {
  cancellationPolicy?: string;
  rules?: string;
}

const POLICY_CONFIG = {
  flexible: {
    label: 'Flessibile',
    description: 'Cancellazione gratuita fino a 24 ore prima del check-in',
    color: 'bg-green-100 text-green-800 border-green-200',
    details: [
      'Rimborso completo se cancelli almeno 24 ore prima',
      'Penale del 50% se cancelli entro 24 ore',
      'Nessun rimborso dopo il check-in'
    ]
  },
  moderate: {
    label: 'Moderata',
    description: 'Cancellazione gratuita fino a 5 giorni prima del check-in',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    details: [
      'Rimborso completo se cancelli almeno 5 giorni prima',
      'Penale del 50% se cancelli entro 5 giorni',
      'Nessun rimborso dopo il check-in'
    ]
  },
  strict: {
    label: 'Rigida',
    description: 'Cancellazione gratuita fino a 14 giorni prima del check-in',
    color: 'bg-red-100 text-red-800 border-red-200',
    details: [
      'Rimborso completo se cancelli almeno 14 giorni prima',
      'Penale del 50% se cancelli entro 14 giorni',
      'Nessun rimborso dopo il check-in'
    ]
  }
};

export function PolicyDisplay({ cancellationPolicy = 'moderate', rules }: PolicyDisplayProps) {
  const policyConfig = POLICY_CONFIG[cancellationPolicy as keyof typeof POLICY_CONFIG] || POLICY_CONFIG.moderate;

  return (
    <div className="space-y-6">
      {/* Cancellation Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Policy di Cancellazione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className={policyConfig.color}>
              {policyConfig.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {policyConfig.description}
            </span>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <InfoIcon className="h-4 w-4" />
              Dettagli della Policy
            </h4>
            <ul className="space-y-1">
              {policyConfig.details.map((detail, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* House Rules */}
      {rules && rules.trim() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Regole della Casa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {rules}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}