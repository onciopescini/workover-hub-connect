import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Code, Lightbulb } from "lucide-react";

export const ErrorExplainer = () => {
  const commonErrors = [
    {
      code: "TS4114",
      title: "Missing Override Modifier",
      description: "I metodi che sovrascrivono la classe base devono avere 'override'",
      before: "componentDidCatch(error: Error) { ... }",
      after: "override componentDidCatch(error: Error) { ... }",
      impact: "Alto - Richiesto per strict mode"
    },
    {
      code: "TS2322",
      title: "String | null Assignment",
      description: "Tipo 'string | null' non assegnabile a 'string'",
      before: "const x: string = maybeNull;",
      after: "const x: string = maybeNull ?? '';",
      impact: "Medio - Safe fallback necessario"
    },
    {
      code: "TS4111",
      title: "Process.env Index Access",
      description: "Le proprietà da index signature richiedono bracket notation",
      before: "process.env.NODE_ENV",
      after: "process.env['NODE_ENV']",
      impact: "Basso - Syntax fix rapido"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          Guida agli Errori TypeScript Strict
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            Il bot applicherà automaticamente queste correzioni mantenendo la compatibilità del codice esistente.
          </AlertDescription>
        </Alert>

        {commonErrors.map((error, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{error.code}</Badge>
                <h3 className="font-semibold">{error.title}</h3>
              </div>
              <Badge variant="outline">{error.impact}</Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {error.description}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-red-600 mb-1">❌ Prima</div>
                <code className="block bg-red-50 border border-red-200 rounded p-2 text-sm">
                  {error.before}
                </code>
              </div>
              
              <div>
                <div className="text-xs font-medium text-green-600 mb-1">✅ Dopo</div>
                <code className="block bg-green-50 border border-green-200 rounded p-2 text-sm">
                  {error.after}
                </code>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};