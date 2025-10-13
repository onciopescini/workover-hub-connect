/**
 * Performance Budget Monitoring Hook
 * 
 * Tracks Core Web Vitals against predefined budgets and triggers alerts
 * when thresholds are exceeded.
 */

import { useEffect, useCallback, useRef } from 'react';
import { onCLS, onLCP, onFCP, onTTFB, onINP } from 'web-vitals';
import { sreLogger } from '@/lib/sre-logger';
import { reportError } from '@/lib/monitoring';

export interface PerformanceBudget {
  metric: string;
  good: number;
  warn: number;
  error: number;
}

const PERFORMANCE_BUDGETS: PerformanceBudget[] = [
  { metric: 'LCP', good: 2500, warn: 3000, error: 4000 },
  { metric: 'CLS', good: 0.1, warn: 0.15, error: 0.25 },
  { metric: 'FCP', good: 1800, warn: 2500, error: 3000 },
  { metric: 'TTFB', good: 800, warn: 1200, error: 1800 },
  { metric: 'INP', good: 200, warn: 500, error: 1000 },
];

export interface BudgetViolation {
  metric: string;
  value: number;
  budget: number;
  level: 'warn' | 'error';
  timestamp: Date;
}

interface UsePerformanceBudgetOptions {
  onViolation?: (violation: BudgetViolation) => void;
  enableAutoReport?: boolean;
}

export const usePerformanceBudget = (options: UsePerformanceBudgetOptions = {}) => {
  const { onViolation, enableAutoReport = true } = options;
  const violationsRef = useRef<BudgetViolation[]>([]);

  const checkBudget = useCallback((metricName: string, value: number) => {
    const budget = PERFORMANCE_BUDGETS.find(b => b.metric === metricName);
    if (!budget) return;

    const thresholds = {
      good: budget.good,
      warn: budget.warn,
      error: budget.error,
    };

    let level: 'warn' | 'error' | null = null;
    let budgetValue = 0;

    if (value > budget.error) {
      level = 'error';
      budgetValue = budget.error;
    } else if (value > budget.warn) {
      level = 'warn';
      budgetValue = budget.warn;
    }

    if (level) {
      const violation: BudgetViolation = {
        metric: metricName,
        value,
        budget: budgetValue,
        level,
        timestamp: new Date(),
      };

      violationsRef.current.push(violation);

      // Log violation
      sreLogger.warn('Performance budget exceeded', {
        metric: metricName,
        value,
        budget: budgetValue,
        level,
        thresholds,
      });

      // Report to monitoring if enabled
      if (enableAutoReport && level === 'error') {
        reportError(
          new Error(`Performance budget exceeded: ${metricName}`),
          {
            page: window.location.pathname,
            feature: 'performance_monitoring',
          },
          level
        );
      }

      // Call violation callback
      if (onViolation) {
        onViolation(violation);
      }
    }
  }, [onViolation, enableAutoReport]);

  useEffect(() => {
    // Monitor Core Web Vitals
    const handlers = [
      onLCP((metric: any) => checkBudget('LCP', metric.value)),
      onCLS((metric: any) => checkBudget('CLS', metric.value)),
      onFCP((metric: any) => checkBudget('FCP', metric.value)),
      onTTFB((metric: any) => checkBudget('TTFB', metric.value)),
      onINP((metric: any) => checkBudget('INP', metric.value)),
    ];

    return () => {
      // Cleanup if needed
    };
  }, [checkBudget]);

  return {
    violations: violationsRef.current,
    budgets: PERFORMANCE_BUDGETS,
  };
};
