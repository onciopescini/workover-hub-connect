
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle, CheckCircle, FileText } from "lucide-react";

interface DAC7Data {
  totalIncome: number;
  totalTransactions: number;
  thresholdMet: boolean;
  reportingYear: number;
}

interface DAC7ReportSectionProps {
  data: DAC7Data;
  year: number;
  onExport: () => void;
}

export const DAC7ReportSection = ({ data, year, onExport }: DAC7ReportSectionProps) => {
  const thresholdMet = data.totalIncome >= 2000 && data.totalTransactions >= 25;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report DAC7 - {year}
          </CardTitle>
          <CardDescription>
            Verifica i requisiti di reporting DAC7 per la dichiarazione fiscale europea
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                €{data.totalIncome.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                Ricavi Totali
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Soglia: €2.000
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {data.totalTransactions}
              </div>
              <div className="text-sm text-muted-foreground">
                Transazioni
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Soglia: 25
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {thresholdMet ? (
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                )}
              </div>
              <Badge 
                variant={thresholdMet ? "destructive" : "secondary"}
                className={thresholdMet ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}
              >
                {thresholdMet ? "Reporting Richiesto" : "Sotto Soglia"}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                Status DAC7
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 border rounded-lg bg-blue-50">
            <h4 className="font-medium text-blue-900 mb-2">
              Informazioni DAC7
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Il reporting DAC7 è obbligatorio se entrambe le soglie sono superate</p>
              <p>• Ricavi ≥ €2.000 E Transazioni ≥ 25 nell'anno fiscale</p>
              <p>• La dichiarazione deve essere presentata entro il 31 gennaio dell'anno successivo</p>
              {thresholdMet && (
                <p className="font-medium text-amber-700">
                  ⚠️ Le tue soglie richiedono la dichiarazione DAC7 per {year}
                </p>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Report generato in tempo reale dai tuoi dati di pagamento
            </div>
            <Button onClick={onExport} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Esporta CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
