/**
 * System Alerts Panel
 * 
 * Displays real-time system alerts for admins with filtering and acknowledgment.
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSystemAlerts } from '@/hooks/monitoring/useSystemAlerts';
import type { SystemAlert } from '@/hooks/monitoring/useSystemAlerts';
import { cn } from '@/lib/utils';

interface SystemAlertsPanelProps {
  className?: string;
  maxHeight?: string;
}

export function SystemAlertsPanel({ className, maxHeight = '500px' }: SystemAlertsPanelProps) {
  const { alerts, acknowledgeAlert, clearAlerts, unacknowledgedCount, criticalCount } = useSystemAlerts();
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'critical'>('unacknowledged');

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unacknowledged') return !alert.acknowledged;
    if (filter === 'critical') return alert.severity === 'critical';
    return true;
  });

  const getSeverityIcon = (severity: SystemAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: SystemAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getTypeColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'performance':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'security':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">System Alerts</h3>
          <p className="text-sm text-muted-foreground">
            {unacknowledgedCount} unacknowledged • {criticalCount} critical
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({alerts.length})
          </Button>
          <Button
            variant={filter === 'unacknowledged' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unacknowledged')}
          >
            Unread ({unacknowledgedCount})
          </Button>
          <Button
            variant={filter === 'critical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('critical')}
          >
            Critical ({criticalCount})
          </Button>
        </div>
      </div>

      <ScrollArea style={{ maxHeight }} className="pr-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p>No alerts matching filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className={cn(
                  'p-4 rounded-lg border transition-opacity',
                  alert.acknowledged && 'opacity-50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <Badge className={cn('text-xs', getTypeColor(alert.type))}>
                        {alert.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    <h4 className="font-medium mb-1">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    
                    {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer">
                          View details
                        </summary>
                        <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto">
                          {JSON.stringify(alert.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  {!alert.acknowledged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {alerts.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={clearAlerts} className="w-full">
            Clear All Alerts
          </Button>
        </div>
      )}
    </Card>
  );
}
