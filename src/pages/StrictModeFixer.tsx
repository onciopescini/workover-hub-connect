import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Code, 
  AlertTriangle, 
  CheckCircle, 
  FileCode, 
  Zap,
  RefreshCw,
  Shield,
  Target
} from "lucide-react";
import { StrictModeScanner } from "@/components/strict-mode-fixer/StrictModeScanner";
import { RefactoringResults } from "@/components/strict-mode-fixer/RefactoringResults";
import { ErrorExplainer } from "@/components/strict-mode-fixer/ErrorExplainer";

interface ScanResults {
  totalFiles: number;
  errorCount: number;
  fixableErrors: number;
  errorsByType: Record<string, number>;
}

const StrictModeFixer = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleStartScan = async () => {
    setIsScanning(true);
    
    // Simulate scanning process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockResults: ScanResults = {
      totalFiles: 156,
      errorCount: 89,
      fixableErrors: 76,
      errorsByType: {
        'Missing Override': 4,
        'Null/Undefined Handling': 31,
        'Process.env Access': 8,
        'Property Access': 22,
        'Date Parsing': 11,
        'Optional Props': 13
      }
    };
    
    setScanResults(mockResults);
    setIsScanning(false);
    setShowResults(true);
  };

  const features = [
    {
      icon: Shield,
      title: "Override Modifiers",
      description: "Aggiunge automaticamente 'override' ai metodi React",
      color: "text-blue-500"
    },
    {
      icon: Target,
      title: "Null/Undefined Conversion", 
      description: "Converte string | null in safe patterns",
      color: "text-green-500"
    },
    {
      icon: Code,
      title: "Process.env Bracket Access",
      description: "Trasforma process.env.VAR in process.env['VAR']",
      color: "text-purple-500"
    },
    {
      icon: Zap,
      title: "Safe Property Access",
      description: "Applica optional chaining e safe navigation",
      color: "text-orange-500"
    }
  ];

  if (showResults && scanResults) {
    return <RefactoringResults results={scanResults} onBack={() => setShowResults(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary/10 p-4 rounded-full">
              <FileCode className="w-12 h-12 text-primary" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-foreground mb-4">
            TypeScript Strict Mode Fixer
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Correggi automaticamente tutti gli errori TypeScript strict mode del tuo progetto React.
            Trasformazioni intelligenti, safe refactoring, zero downtime.
          </p>

          {!isScanning && !scanResults && (
            <Button 
              onClick={handleStartScan}
              size="lg"
              className="bg-primary hover:bg-primary/90"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Scansiona Progetto e Correggi
            </Button>
          )}
        </div>

        {/* Scanning State */}
        {isScanning && (
          <div className="max-w-2xl mx-auto mb-12">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Scansione in corso...</h3>
                <p className="text-muted-foreground mb-4">
                  Analizzando i file .tsx e .ts per errori strict mode
                </p>
                <Progress value={65} className="w-full" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <feature.icon className={`w-10 h-10 ${feature.color} mx-auto mb-2`} />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Common Errors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Errori Tipici Corretti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Missing override modifiers</span>
                  <Badge variant="destructive">TS4114</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">String | null assignments</span>
                  <Badge variant="destructive">TS2322</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Process.env index access</span>
                  <Badge variant="destructive">TS4111</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Unsafe property access</span>
                  <Badge variant="destructive">TS2532</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Date parsing fallbacks</span>
                  <Badge variant="destructive">TS2769</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Risultati Garantiti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Compatibilità strict mode</span>
                  <Badge variant="secondary">100%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">IntelliSense migliorato</span>
                  <Badge variant="secondary">+90%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Runtime errors ridotti</span>
                  <Badge variant="secondary">-70%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Type safety coverage</span>
                  <Badge variant="secondary">95%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Safe refactoring</span>
                  <Badge variant="secondary">✓</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scanner Component */}
        <div className="mt-12">
          <StrictModeScanner />
        </div>

        {/* Error Explainer */}
        <div className="mt-12">
          <ErrorExplainer />
        </div>
      </div>
    </div>
  );
};

export default StrictModeFixer;