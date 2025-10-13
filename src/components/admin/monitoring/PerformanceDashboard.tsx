/**
 * Performance Dashboard
 * 
 * Real-time performance monitoring dashboard for admins showing Core Web Vitals,
 * budget violations, and system health metrics.
 */

import React from 'react';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePerformanceBudget } from '@/hooks/monitoring/usePerformanceBudget';
import { cn } from '@/lib/utils';

interface PerformanceDashboardProps {
  className?: string;
}

export function PerformanceDashboard({ className }: PerformanceDashboardProps) {
  const { violations, budgets } = usePerformanceBudget({
    enableAutoReport: true,
  });

  // Get latest violation for each metric
  const latestViolations = budgets.map(budget => {
    const metricViolations = violations
      .filter(v => v.metric === budget.metric)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return {
      metric: budget.metric,
      budget,
      violation: metricViolations[0],
      count: metricViolations.length,
    };
  });

  const getStatusIcon = (violation?: { level: 'warn' | 'error' }) => {
    if (!violation) return <Minus className="w-4 h-4 text-green-500" />;
    if (violation.level === 'error') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <TrendingUp className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusColor = (violation?: { level: 'warn' | 'error' }) => {
    if (!violation) return 'default';
    if (violation.level === 'error') return 'destructive';
    return 'secondary';
  };

  const getProgressValue = (value: number, budget: { good: number; warn: number; error: number }) => {
    if (value <= budget.good) return 100;
    if (value <= budget.warn) return 75;
    if (value <= budget.error) return 50;
    return 25;
  };

  const totalViolations = violations.length;
  const criticalViolations = violations.filter(v => v.level === 'error').length;
  const warningViolations = violations.filter(v => v.level === 'warn').length;

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Total Violations</span>
          </div>
          <p className="text-2xl font-bold">{totalViolations}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium">Critical</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{criticalViolations}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">Warnings</span>
          </div>
          <p className="text-2xl font-bold text-yellow-500">{warningViolations}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Core Web Vitals Budgets</h3>
        <div className="space-y-4">
          {latestViolations.map(({ metric, budget, violation, count }) => (
            <div key={metric} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(violation)}
                  <span className="font-medium">{metric}</span>
                  {count > 0 && (
                    <Badge variant={getStatusColor(violation)} className="text-xs">
                      {count} violations
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Budget: {budget.good}ms
                  {violation && (
                    <span className={cn(
                      'ml-2 font-medium',
                      violation.level === 'error' ? 'text-red-500' : 'text-yellow-500'
                    )}>
                      Current: {Math.round(violation.value)}ms
                    </span>
                  )}
                </div>
              </div>
              
              <Progress 
                value={violation ? getProgressValue(violation.value, budget) : 100}
                className={cn(
                  'h-2',
                  !violation && 'bg-green-100',
                  violation?.level === 'warn' && 'bg-yellow-100',
                  violation?.level === 'error' && 'bg-red-100'
                )}
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Good: &lt;{budget.good}</span>
                <span>Warn: &lt;{budget.warn}</span>
                <span>Error: &lt;{budget.error}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
