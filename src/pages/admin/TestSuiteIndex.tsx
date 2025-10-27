import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TestTube, CheckCircle, Activity, AlertTriangle, Code } from "lucide-react";

interface TestSuiteCard {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  badge: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
}

const TestSuiteIndex = () => {
  const navigate = useNavigate();

  const testSuites: TestSuiteCard[] = [
    {
      id: 'networking',
      title: 'Networking Test Suite',
      description: 'Monitor sistema networking, performance, health checks e sicurezza del sistema di connessioni.',
      path: '/networking-test-suite',
      icon: <Activity className="w-6 h-6 text-blue-600" />,
      badge: 'Real-time monitoring',
      badgeVariant: 'default'
    },
    {
      id: 'qa-validation',
      title: 'QA Validation Dashboard',
      description: 'Comprehensive QA automation, console cleanup, performance validation e test automatici.',
      path: '/qa-validation',
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      badge: 'Automated tests',
      badgeVariant: 'secondary'
    },
    {
      id: 'regression',
      title: 'Regression Validation',
      description: 'Regression tests per platform integrity, validazione completa cross-modulo.',
      path: '/regression-validation',
      icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
      badge: 'Safety checks',
      badgeVariant: 'outline'
    },
    {
      id: 'strict-mode',
      title: 'TypeScript Strict Mode Fixer',
      description: 'Tool per risolvere errori TypeScript strict mode e migliorare la qualità del codice.',
      path: '/strict-mode-fixer',
      icon: <Code className="w-6 h-6 text-purple-600" />,
      badge: 'Development tool',
      badgeVariant: 'secondary'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <TestTube className="w-8 h-8" />
            Test Suite Index
          </h1>
          <p className="text-gray-600 mt-2">
            Hub centrale per tutti gli strumenti di testing e validazione della piattaforma
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testSuites.map((suite) => (
          <Card key={suite.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {suite.icon}
                  <div>
                    <CardTitle className="text-xl">{suite.title}</CardTitle>
                    <Badge variant={suite.badgeVariant} className="mt-2">
                      {suite.badge}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base mb-4">
                {suite.description}
              </CardDescription>
              <Button 
                onClick={() => navigate(suite.path)}
                className="w-full"
              >
                Apri Test Suite
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>Nota:</strong> Questi strumenti sono disponibili solo in ambiente di sviluppo e per utenti amministratori.
            In produzione, l'accesso è limitato per garantire sicurezza e stabilità del sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestSuiteIndex;
