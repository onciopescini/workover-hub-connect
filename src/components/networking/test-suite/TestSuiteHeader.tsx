
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TestTube, CheckCircle, AlertTriangle } from "lucide-react";

interface TestSuiteHeaderProps {
  overallStatus: 'unknown' | 'healthy' | 'warning' | 'critical';
  onRunFullTest: () => void;
}

export const TestSuiteHeader: React.FC<TestSuiteHeaderProps> = ({
  overallStatus,
  onRunFullTest
}) => {
  const getStatusConfig = () => {
    switch (overallStatus) {
      case 'healthy':
        return { icon: CheckCircle, color: 'bg-green-500', text: 'Sistema Operativo' };
      case 'warning':
        return { icon: AlertTriangle, color: 'bg-yellow-500', text: 'Attenzione' };
      case 'critical':
        return { icon: AlertTriangle, color: 'bg-red-500', text: 'Critico' };
      default:
        return { icon: TestTube, color: 'bg-gray-500', text: 'Non Testato' };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <TestTube className="w-8 h-8" />
            Suite di Test Networking - Fase 5 (Produzione)
          </h1>
          <p className="text-gray-600 mt-2">
            Monitoraggio completo, testing, documentazione e sistema production-ready
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${statusConfig.color} text-white flex items-center gap-1`}>
            <StatusIcon className="w-4 h-4" />
            {statusConfig.text}
          </Badge>
          <Button onClick={onRunFullTest}>
            Esegui Test Completo
          </Button>
        </div>
      </div>
    </div>
  );
};
