import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceHealth;
    auth: ServiceHealth;
    storage: ServiceHealth;
    functions: ServiceHealth;
  };
  metrics: {
    responseTime: number;
    activeConnections?: number;
    cacheHitRate?: number;
    errorRate?: number;
  };
  version: string;
}

interface ServiceHealth {
  status: 'operational' | 'degraded' | 'down';
  latency?: number;
  error?: string;
  lastCheck: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'operational', lastCheck: new Date().toISOString() },
      auth: { status: 'operational', lastCheck: new Date().toISOString() },
      storage: { status: 'operational', lastCheck: new Date().toISOString() },
      functions: { status: 'operational', lastCheck: new Date().toISOString() }
    },
    metrics: {
      responseTime: 0,
      activeConnections: 0,
      cacheHitRate: 0,
      errorRate: 0
    },
    version: '3.0.0'
  };

  // Database health check with connection pooling metrics
  try {
    const dbStart = performance.now();
    const { error: dbError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    const dbLatency = performance.now() - dbStart;
    
    if (dbError) throw dbError;

    healthStatus.services.database = {
      status: dbLatency < 100 ? 'operational' : 'degraded',
      latency: Math.round(dbLatency),
      lastCheck: new Date().toISOString()
    };

    // Get active connections from database
    const { data: connData } = await supabase
      .rpc('get_aggregated_metrics', {
        metric_type_param: 'db_connections',
        time_window_hours: 1
      });

    if (connData) {
      healthStatus.metrics.activeConnections = connData.avg_value || 0;
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    healthStatus.services.database = {
      status: 'down',
      error: (error as Error).message,
      lastCheck: new Date().toISOString()
    };
    healthStatus.status = 'unhealthy';
  }

  // Auth service health check
  try {
    const authStart = performance.now();
    const { error: authError } = await supabase.auth.getSession();
    const authLatency = performance.now() - authStart;

    if (authError) throw authError;

    healthStatus.services.auth = {
      status: authLatency < 100 ? 'operational' : 'degraded',
      latency: Math.round(authLatency),
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    console.error('Auth health check failed:', error);
    healthStatus.services.auth = {
      status: 'down',
      error: (error as Error).message,
      lastCheck: new Date().toISOString()
    };
    healthStatus.status = healthStatus.status === 'unhealthy' ? 'unhealthy' : 'degraded';
  }

  // Storage health check
  try {
    const storageStart = performance.now();
    const { error: storageError } = await supabase.storage.listBuckets();
    const storageLatency = performance.now() - storageStart;

    if (storageError) throw storageError;

    healthStatus.services.storage = {
      status: storageLatency < 150 ? 'operational' : 'degraded',
      latency: Math.round(storageLatency),
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    console.error('Storage health check failed:', error);
    healthStatus.services.storage = {
      status: 'down',
      error: (error as Error).message,
      lastCheck: new Date().toISOString()
    };
    healthStatus.status = healthStatus.status === 'unhealthy' ? 'unhealthy' : 'degraded';
  }

  // Get cache hit rate from metrics
  try {
    const { data: cacheData } = await supabase
      .rpc('get_aggregated_metrics', {
        metric_type_param: 'cache_hit_rate',
        time_window_hours: 1
      });

    if (cacheData) {
      healthStatus.metrics.cacheHitRate = Math.round(cacheData.avg_value || 0);
    }
  } catch (error) {
    console.error('Cache metrics fetch failed:', error);
  }

  // Get error rate from metrics
  try {
    const { data: errorData } = await supabase
      .rpc('get_aggregated_metrics', {
        metric_type_param: 'error_rate',
        time_window_hours: 1
      });

    if (errorData) {
      healthStatus.metrics.errorRate = parseFloat((errorData.avg_value || 0).toFixed(2));
    }
  } catch (error) {
    console.error('Error metrics fetch failed:', error);
  }

  // Functions self-check
  healthStatus.services.functions = {
    status: 'operational',
    latency: Math.round(performance.now() - startTime),
    lastCheck: new Date().toISOString()
  };

  // Calculate response time
  healthStatus.metrics.responseTime = Math.round(performance.now() - startTime);

  // Overall status determination
  const serviceStatuses = Object.values(healthStatus.services).map(s => s.status);
  if (serviceStatuses.some(s => s === 'down')) {
    healthStatus.status = 'unhealthy';
  } else if (serviceStatuses.some(s => s === 'degraded')) {
    healthStatus.status = 'degraded';
  }

  // Log health check
  console.log('Health check completed:', {
    status: healthStatus.status,
    response_time: healthStatus.metrics.responseTime,
    services: Object.fromEntries(
      Object.entries(healthStatus.services).map(([k, v]) => [k, v.status])
    )
  });

  const httpStatus = healthStatus.status === 'healthy' ? 200 : 503;

  return new Response(JSON.stringify(healthStatus), {
    status: httpStatus,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
});
