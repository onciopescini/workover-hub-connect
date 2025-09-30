import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Users, 
  Zap,
  RefreshCw
} from 'lucide-react';
import { useMetricsCollection } from '@/hooks/useMetricsCollection';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function SREDashboard() {
  const { apiMetrics, bookingMetrics, sessionMetrics, getSessionDuration } = useMetricsCollection();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Calculate derived metrics
  const errorRate = apiMetrics.requestCount > 0 
    ? (apiMetrics.errorCount / apiMetrics.requestCount) * 100 
    : 0;
  
  const successRate = apiMetrics.successRate;

  const bookingSuccessRate = bookingMetrics.totalAttempts > 0
    ? (bookingMetrics.successfulBookings / bookingMetrics.totalAttempts) * 100
    : 0;

  // Alert thresholds
  const alerts: Array<{ severity: 'critical' | 'warning'; message: string; metric: string }> = [];
  if (apiMetrics.p95Latency > 500) {
    alerts.push({
      severity: 'critical',
      message: `API P95 Latency: ${Math.round(apiMetrics.p95Latency)}ms (threshold: 500ms)`,
      metric: 'latency'
    });
  }
  if (errorRate > 5) {
    alerts.push({
      severity: 'critical',
      message: `Error Rate: ${errorRate.toFixed(1)}% (threshold: 5%)`,
      metric: 'error_rate'
    });
  }
  if (apiMetrics.p95Latency > 200 && apiMetrics.p95Latency <= 500) {
    alerts.push({
      severity: 'warning',
      message: `API P95 Latency: ${Math.round(apiMetrics.p95Latency)}ms (target: <200ms)`,
      metric: 'latency'
    });
  }

  // Status badge color
  const getStatusColor = () => {
    if (alerts.some(a => a.severity === 'critical')) return 'destructive';
    if (alerts.some(a => a.severity === 'warning')) return 'secondary';
    return 'default';
  };

  const getStatusText = () => {
    if (alerts.some(a => a.severity === 'critical')) return 'Degraded';
    if (alerts.some(a => a.severity === 'warning')) return 'Warning';
    return 'Healthy';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">SRE Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time performance & observability metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Last updated</p>
            <p className="text-sm font-medium">{lastUpdate.toLocaleTimeString()}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLastUpdate(new Date())}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Status
            </CardTitle>
            <Badge variant={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <Alert key={i} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    {alert.severity === 'critical' ? 'Critical' : 'Warning'}
                  </AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">All systems operational</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* API Latency (P95) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              API Latency (P95)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {Math.round(apiMetrics.p95Latency)}ms
              </div>
              <Progress 
                value={Math.min((apiMetrics.p95Latency / 500) * 100, 100)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Target: &lt;200ms
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {errorRate.toFixed(1)}%
              </div>
              <Progress 
                value={Math.min((errorRate / 5) * 100, 100)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {apiMetrics.errorCount} / {apiMetrics.requestCount} requests
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Booking Success Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-600" />
              Booking Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {bookingSuccessRate.toFixed(1)}%
              </div>
              <Progress 
                value={bookingSuccessRate} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {bookingMetrics.successfulBookings} / {bookingMetrics.totalAttempts} attempts
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              Active Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {Math.floor(getSessionDuration() / 1000 / 60)}m
              </div>
              <Progress 
                value={Math.min((getSessionDuration() / 1000 / 60 / 30) * 100, 100)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {sessionMetrics.pageViews} page views • {sessionMetrics.userActions} actions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Performance Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>API Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{apiMetrics.requestCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{successRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Latency</p>
                <p className="text-2xl font-bold">{Math.round(apiMetrics.avgLatency)}ms</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed Requests</p>
                <p className="text-2xl font-bold text-red-600">{apiMetrics.errorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Activity */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Session Duration</p>
                <p className="text-2xl font-bold">
                  {Math.floor(getSessionDuration() / 1000 / 60)}m {Math.floor((getSessionDuration() / 1000) % 60)}s
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Page Views</p>
                <p className="text-2xl font-bold">{sessionMetrics.pageViews}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User Actions</p>
                <p className="text-2xl font-bold">{sessionMetrics.userActions}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed Bookings</p>
                <p className="text-2xl font-bold text-orange-600">{bookingMetrics.failedBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">API P95 Latency</span>
                <Badge variant={apiMetrics.p95Latency < 200 ? 'default' : 'destructive'}>
                  {Math.round(apiMetrics.p95Latency)}ms
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">Target: &lt;200ms</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Error Rate</span>
                <Badge variant={errorRate < 1 ? 'default' : 'destructive'}>
                  {errorRate.toFixed(2)}%
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">Target: &lt;1%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Booking Success Rate</span>
                <Badge variant={bookingSuccessRate > 99.5 ? 'default' : 'destructive'}>
                  {bookingSuccessRate.toFixed(1)}%
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">Target: &gt;99.5%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
