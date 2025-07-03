/**
 * QA Validation Dashboard
 * 
 * Enhanced version of ValidationDashboard with comprehensive QA automation,
 * console cleanup tracking, and performance monitoring.
 */
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Target,
  Zap,
  Bug,
  FileText,
  BarChart3
} from 'lucide-react';
import { qaAutomationSuite, type QAValidationResult } from '@/lib/qa/qa-automation';
import { consoleCleanupScanner } from '@/lib/qa/console-cleanup-scanner';
import { useLogger } from '@/hooks/useLogger';

const QAValidationDashboard = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<QAValidationResult | null>(null);
  const [consoleCleanupResult, setConsoleCleanupResult] = useState<any>(null);
  const { info } = useLogger({ context: 'QAValidationDashboard' });

  const handleRunFullValidation = async () => {
    setIsRunning(true);
    try {
      info('Starting full QA validation suite');
      const result = await qaAutomationSuite.runFullValidation();
      setLastResult(result);
    } catch (error) {
      info('QA validation failed', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsRunning(false);
    }
  };

  const handleConsoleCleanupScan = async () => {
    try {
      info('Starting console cleanup scan');
      const result = await consoleCleanupScanner.scanProject();
      setConsoleCleanupResult(result);
    } catch (error) {
      info('Console cleanup scan failed', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    }
  };

  const getStatusBadge = (status: 'pass' | 'fail' | 'warning') => {
    const variants = {
      pass: 'default',
      fail: 'destructive',
      warning: 'secondary',
    } as const;
    
    return (
      <Badge variant={variants[status]} className="ml-2">
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            WorkoverHub QA Validation Suite
          </h1>
          <p className="text-lg text-muted-foreground">
            Comprehensive testing, console cleanup, and performance monitoring
          </p>
          {lastResult && (
            <div className="mt-4">
              <Badge variant="outline" className="text-sm">
                Last run: {lastResult.timestamp.toLocaleString()}
              </Badge>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Full QA Suite
              </CardTitle>
              <CardDescription>
                Complete validation of all quality metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isRunning && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Running validation...</span>
                  </div>
                )}
                <Button 
                  onClick={handleRunFullValidation}
                  disabled={isRunning}
                  className="w-full"
                >
                  {isRunning ? 'Running...' : 'Run Full Validation'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Console Cleanup
              </CardTitle>
              <CardDescription>
                Scan for console.* usage in production code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {consoleCleanupResult && (
                  <div className="text-sm">
                    <span className="font-medium">
                      {consoleCleanupResult.totalConsoleUsages} console statements found
                    </span>
                    <br />
                    <span className="text-muted-foreground">
                      {consoleCleanupResult.productionRiskFiles.length} production risk files
                    </span>
                  </div>
                )}
                <Button 
                  onClick={handleConsoleCleanupScan}
                  variant="outline"
                  className="w-full"
                >
                  Scan Console Usage
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Test
              </CardTitle>
              <CardDescription>
                Bundle size, render time, and Lighthouse scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => info('Performance test started (placeholder)')}
              >
                Run Performance Test
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Validation Results */}
        {lastResult && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Validation Results</CardTitle>
              <CardDescription>
                Latest QA validation summary and detailed metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="console">Console</TabsTrigger>
                  <TabsTrigger value="tests">Tests</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Console Cleanup</span>
                        {getStatusIcon(lastResult.consoleCleanup.status)}
                      </div>
                      <div className="mt-2">
                        <div className="text-2xl font-bold">
                          {lastResult.consoleCleanup.totalConsoleUsages}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          console statements
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Test Coverage</span>
                        {getStatusIcon(lastResult.testCoverage.status)}
                      </div>
                      <div className="mt-2">
                        <div className="text-2xl font-bold">
                          {lastResult.testCoverage.percentage}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          coverage
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Performance</span>
                        {getStatusIcon(lastResult.performance.status)}
                      </div>
                      <div className="mt-2">
                        <div className="text-2xl font-bold">
                          {lastResult.performance.lighthouseScore}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Lighthouse score
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Regression Tests</span>
                        {getStatusIcon(lastResult.regressionTests.status)}
                      </div>
                      <div className="mt-2">
                        <div className="text-2xl font-bold">
                          {lastResult.regressionTests.passedTests}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          tests passed
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="console" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Console Cleanup Status</h3>
                      {getStatusBadge(lastResult.consoleCleanup.status)}
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium mb-2">Total Console Usage</div>
                        <div className="text-3xl font-bold text-red-600">
                          {lastResult.consoleCleanup.totalConsoleUsages}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          statements found
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium mb-2">Production Risk Files</div>
                        <div className="text-3xl font-bold text-amber-600">
                          {lastResult.consoleCleanup.productionRiskFiles}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          files need attention
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm font-medium mb-2">
                        Target: 0 console statements in production code
                      </div>
                      <Progress 
                        value={lastResult.consoleCleanup.totalConsoleUsages === 0 ? 100 : 0} 
                        className="w-full"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tests" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Test Coverage & Regression</h3>
                      {getStatusBadge(lastResult.testCoverage.status)}
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium mb-2">Coverage Percentage</div>
                        <div className="text-3xl font-bold">
                          {lastResult.testCoverage.percentage}%
                        </div>
                        <Progress 
                          value={lastResult.testCoverage.percentage} 
                          className="mt-2"
                        />
                        <div className="text-sm text-muted-foreground mt-1">
                          Target: 80%+
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium mb-2">Regression Tests</div>
                        <div className="text-3xl font-bold text-green-600">
                          {lastResult.regressionTests.passedTests}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          passed • {lastResult.regressionTests.failedTests} failed
                        </div>
                      </div>
                    </div>
                    
                    {lastResult.testCoverage.missingTests.length > 0 && (
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium mb-2">Missing Tests</div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {lastResult.testCoverage.missingTests.map((test, index) => (
                            <li key={index}>• {test}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Performance Metrics</h3>
                      {getStatusBadge(lastResult.performance.status)}
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium mb-2">Bundle Size</div>
                        <div className="text-3xl font-bold">
                          {lastResult.performance.bundleSize}MB
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Target: &lt;3MB
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium mb-2">Rendering Time</div>
                        <div className="text-3xl font-bold">
                          {lastResult.performance.renderingTime}ms
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Target: &lt;100ms
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium mb-2">Lighthouse Score</div>
                        <div className="text-3xl font-bold">
                          {lastResult.performance.lighthouseScore}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Target: 90+
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Console Cleanup Results */}
        {consoleCleanupResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Console Cleanup Scan Results
              </CardTitle>
              <CardDescription>
                Detailed breakdown of console usage across the codebase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm font-medium">Total Files Scanned</div>
                    <div className="text-2xl font-bold">{consoleCleanupResult.totalFiles}</div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm font-medium">Console Statements</div>
                    <div className="text-2xl font-bold text-red-600">
                      {consoleCleanupResult.totalConsoleUsages}
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm font-medium">Production Risk Files</div>
                    <div className="text-2xl font-bold text-amber-600">
                      {consoleCleanupResult.productionRiskFiles.length}
                    </div>
                  </div>
                </div>
                
                {Object.keys(consoleCleanupResult.usagesByType).length > 0 && (
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm font-medium mb-2">Usage by Type</div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {Object.entries(consoleCleanupResult.usagesByType).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-sm">
                          <span>console.{type}</span>
                          <Badge variant="outline">{count as number}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QAValidationDashboard;