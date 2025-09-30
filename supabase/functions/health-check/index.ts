import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'unknown',
      auth: 'unknown',
      storage: 'unknown'
    },
    metrics: {
      responseTime: 0
    }
  };

  const startTime = Date.now();

  try {
    // Test Database Connection
    const { error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    healthStatus.services.database = dbError ? 'unhealthy' : 'healthy';

    // Test Auth Service
    const { error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    healthStatus.services.auth = authError ? 'degraded' : 'healthy';

    // Test Storage
    const { error: storageError } = await supabase.storage.listBuckets();
    healthStatus.services.storage = storageError ? 'unhealthy' : 'healthy';

    healthStatus.metrics.responseTime = Date.now() - startTime;

    // Determine overall status
    const services = Object.values(healthStatus.services);
    if (services.includes('unhealthy')) {
      healthStatus.status = 'unhealthy';
    } else if (services.includes('degraded')) {
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    return new Response(
      JSON.stringify(healthStatus),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 503,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
