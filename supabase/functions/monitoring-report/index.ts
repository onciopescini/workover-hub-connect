/**
 * Monitoring Report Edge Function
 * 
 * Generates automated monitoring reports for admins, aggregating system health,
 * performance metrics, and alert summaries.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ErrorHandler } from '../_shared/error-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonitoringReportData {
  period: {
    start: string;
    end: string;
  };
  health: {
    status: string;
    uptime: number;
    lastCheck: string;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    totalRequests: number;
  };
  alerts: {
    total: number;
    critical: number;
    warnings: number;
    byType: Record<string, number>;
  };
  topErrors: Array<{
    message: string;
    count: number;
    lastOccurrence: string;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request parameters
    const url = new URL(req.url);
    const periodHours = parseInt(url.searchParams.get('hours') || '24', 10);
    const startDate = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    const endDate = new Date();

    ErrorHandler.logInfo('Generating monitoring report', { 
      userId: user.id, 
      periodHours 
    });

    // Fetch health check data
    const { data: healthData } = await supabaseClient
      .functions
      .invoke('health-check');

    // Fetch performance metrics
    const { data: perfMetrics } = await supabaseClient
      .from('performance_metrics')
      .select('metric_type, metric_value')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Fetch alerts
    const { data: alerts } = await supabaseClient
      .from('admin_actions_log')
      .select('action_type, description, metadata, created_at')
      .in('action_type', ['system_error', 'security_alert', 'performance_alert'])
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Calculate performance stats
    const responseTimes = perfMetrics
      ?.filter(m => m.metric_type === 'response_time')
      .map(m => m.metric_value) || [];
    
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95ResponseTime = sortedTimes[p95Index] || 0;

    // Calculate alert stats
    const alertsByType: Record<string, number> = {};
    let criticalCount = 0;
    let warningCount = 0;

    alerts?.forEach(alert => {
      alertsByType[alert.action_type] = (alertsByType[alert.action_type] || 0) + 1;
      
      const severity = alert.metadata?.severity || alert.metadata?.level;
      if (severity === 'critical' || severity === 'error') {
        criticalCount++;
      } else if (severity === 'warning' || severity === 'warn') {
        warningCount++;
      }
    });

    // Find top errors
    const errorGroups: Record<string, { count: number; lastOccurrence: string }> = {};
    
    alerts?.forEach(alert => {
      const message = alert.description || alert.metadata?.message || 'Unknown error';
      if (!errorGroups[message]) {
        errorGroups[message] = { count: 0, lastOccurrence: alert.created_at };
      }
      errorGroups[message].count++;
      if (new Date(alert.created_at) > new Date(errorGroups[message].lastOccurrence)) {
        errorGroups[message].lastOccurrence = alert.created_at;
      }
    });

    const topErrors = Object.entries(errorGroups)
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Build report
    const report: MonitoringReportData = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      health: {
        status: healthData?.status || 'unknown',
        uptime: healthData?.uptime || 0,
        lastCheck: healthData?.timestamp || new Date().toISOString(),
      },
      performance: {
        avgResponseTime: Math.round(avgResponseTime),
        p95ResponseTime: Math.round(p95ResponseTime),
        errorRate: perfMetrics?.length ? (alerts?.length || 0) / perfMetrics.length : 0,
        totalRequests: perfMetrics?.length || 0,
      },
      alerts: {
        total: alerts?.length || 0,
        critical: criticalCount,
        warnings: warningCount,
        byType: alertsByType,
      },
      topErrors,
    };

    ErrorHandler.logSuccess('Monitoring report generated', {
      alertsTotal: report.alerts.total,
      criticalCount,
    });

    return new Response(
      JSON.stringify(report),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    ErrorHandler.logError('Monitoring report generation failed', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate monitoring report',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
