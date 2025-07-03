import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  FileCode,
  Download,
  Play
} from "lucide-react";

interface ScanResults {
  totalFiles: number;
  errorCount: number;
  fixableErrors: number;
  errorsByType: Record<string, number>;
}

interface RefactoringResultsProps {
  results: ScanResults;
  onBack: () => void;
}

export const RefactoringResults: React.FC<RefactoringResultsProps> = ({
  results,
  onBack
}) => {
  const [isFixing, setIsFixing] = useState(false);
  const [fixProgress, setFixProgress] = useState(0);

  const handleStartFix = async () => {
    setIsFixing(true);
    
    // Simulate progressive fixing
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setFixProgress(i);
    }
    
    setIsFixing(false);
  };

  const successRate = Math.round((results.fixableErrors / results.errorCount) * 100);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna alla Homepage
        </Button>
        <h1 className="text-2xl font-bold">Risultati Scansione</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <FileCode className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{results.totalFiles}</div>
            <div className="text-sm text-muted-foreground">File Analizzati</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{results.errorCount}</div>
            <div className="text-sm text-muted-foreground">Errori Trovati</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{results.fixableErrors}</div>
            <div className="text-sm text-muted-foreground">Auto-Correggibili</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600">{successRate}%</div>
            <div className="text-sm text-muted-foreground">Tasso di Successo</div>
          </CardContent>
        </Card>
      </div>

      {/* Error Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Dettaglio Errori per Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(results.errorsByType).map(([errorType, count]) => (
              <div key={errorType} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{errorType}</Badge>
                  <span className="text-sm">{count} occorrenze</span>
                </div>
                <Badge variant="secondary" className="text-green-600">
                  Auto-fix disponibile
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fix Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Azioni di Correzione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFixing ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-lg font-semibold mb-2">
                  Correzione in corso... {fixProgress}%
                </div>
                <Progress value={fixProgress} className="w-full" />
              </div>
              
              <div className="text-sm text-muted-foreground">
                {fixProgress < 30 && "Aggiungendo override modifiers..."}
                {fixProgress >= 30 && fixProgress < 60 && "Correggendo null/undefined handling..."}
                {fixProgress >= 60 && fixProgress < 90 && "Sistemando property access..."}
                {fixProgress >= 90 && "Finalizzando correzioni..."}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  onClick={handleStartFix}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Applica Tutte le Correzioni ({results.fixableErrors})
                </Button>
                
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Scarica Report
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Le correzioni verranno applicate automaticamente mantenendo la compatibilità del codice esistente.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};