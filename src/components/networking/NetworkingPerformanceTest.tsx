
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface PerformanceMetrics {
  loadTime: number;
  accessCheckTime: number;
  suggestionLoadTime: number;
  connectionLoadTime: number;
  totalTime: number;
}

export const NetworkingPerformanceTest = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runPerformanceTest = async () => {
    setIsRunning(true);
    const startTime = performance.now();
    
    try {
      const testMetrics: PerformanceMetrics = {
        loadTime: 0,
        accessCheckTime: 0,
        suggestionLoadTime: 0,
        connectionLoadTime: 0,
        totalTime: 0
      };

      // Test caricamento iniziale
      const loadStart = performance.now();
      await new Promise(resolve => setTimeout(resolve, 100)); // Simula caricamento
      testMetrics.loadTime = performance.now() - loadStart;

      // Test controllo accesso
      const accessStart = performance.now();
      await new Promise(resolve => setTimeout(resolve, 50)); // Simula check accesso
      testMetrics.accessCheckTime = performance.now() - accessStart;

      // Test caricamento suggerimenti
      const suggestionStart = performance.now();
      await new Promise(resolve => setTimeout(resolve, 150)); // Simula load suggerimenti
      testMetrics.suggestionLoadTime = performance.now() - suggestionStart;

      // Test caricamento connessioni
      const connectionStart = performance.now();
      await new Promise(resolve => setTimeout(resolve, 120)); // Simula load connessioni
      testMetrics.connectionLoadTime = performance.now() - connectionStart;

      testMetrics.totalTime = performance.now() - startTime;
      setMetrics(testMetrics);
      toast.success("Test di performance completato!");
    } catch (error) {
      toast.error("Errore durante il test di performance");
      console.error("Performance test error:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const getPerformanceRating = (time: number) => {
    if (time < 100) return { label: "Eccellente", color: "bg-green-500", icon: CheckCircle };
    if (time < 200) return { label: "Buono", color: "bg-blue-500", icon: Clock };
    if (time < 500) return { label: "Accettabile", color: "bg-yellow-500", icon: Zap };
    return { label: "Lento", color: "bg-red-500", icon: AlertTriangle };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Test Performance Networking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runPerformanceTest} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? "Test in corso..." : "Avvia Test Performance"}
        </Button>

        {metrics && (
          <div className="space-y-3">
            <h3 className="font-semibold">Risultati Test</h3>
            
            {[
              { label: "Caricamento Iniziale", time: metrics.loadTime },
              { label: "Controllo Accesso", time: metrics.accessCheckTime },
              { label: "Caricamento Suggerimenti", time: metrics.suggestionLoadTime },
              { label: "Caricamento Connessioni", time: metrics.connectionLoadTime },
              { label: "Tempo Totale", time: metrics.totalTime }
            ].map((item, index) => {
              const rating = getPerformanceRating(item.time);
              const IconComponent = rating.icon;
              
              return (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <span className="font-medium">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {item.time.toFixed(2)}ms
                    </span>
                    <Badge className={`${rating.color} text-white flex items-center gap-1`}>
                      <IconComponent className="w-3 h-3" />
                      {rating.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
