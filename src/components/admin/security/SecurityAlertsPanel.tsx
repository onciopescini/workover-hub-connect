import { useSecurityMetrics } from '@/hooks/useSecurityMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Shield, Users, Lock } from 'lucide-react';

export const SecurityAlertsPanel = () => {
  const { data: metrics, isLoading } = useSecurityMetrics();

  if (isLoading) {
    return <div>Loading security metrics...</div>;
  }

  const alerts = [];

  if ((metrics?.failedLogins24h || 0) > 50) {
    alerts.push({
      title: 'High Failed Login Rate',
      description: `${metrics?.failedLogins24h} failed login attempts in last 24 hours`,
      severity: 'high'
    });
  }

  if ((metrics?.rateLimitViolations24h || 0) > 100) {
    alerts.push({
      title: 'Excessive Rate Limit Violations',
      description: `${metrics?.rateLimitViolations24h} rate limit violations detected`,
      severity: 'medium'
    });
  }

  if ((metrics?.suspiciousActivity || 0) > 5) {
    alerts.push({
      title: 'Suspicious Activity Detected',
      description: `${metrics?.suspiciousActivity} users with multiple IPs in last hour`,
      severity: 'high'
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins (24h)</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.failedLogins24h || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit Violations</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.rateLimitViolations24h || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeSessions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.suspiciousActivity || 0}</div>
          </CardContent>
        </Card>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Active Alerts</h3>
          {alerts.map((alert, index) => (
            <Alert key={index} variant={alert.severity === 'high' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription>{alert.description}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {alerts.length === 0 && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>All Clear</AlertTitle>
          <AlertDescription>No security alerts at this time</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
