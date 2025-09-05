import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.3.9.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateLimitRequest {
  action: 'login' | 'password_reset' | 'signup' | 'profile_update';
  identifier?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service key for database access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     req.headers.get('cf-connecting-ip') ||
                     'unknown';

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { action, identifier }: RateLimitRequest = await req.json();
    
    if (!action || !['login', 'password_reset', 'signup', 'profile_update'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Configure rate limits based on action
    let maxAttempts: number;
    let windowMinutes: number;
    
    switch (action) {
      case 'login':
        maxAttempts = 5;
        windowMinutes = 15;
        break;
      case 'password_reset':
        maxAttempts = 3;
        windowMinutes = 60;
        if (!identifier) {
          return new Response(
            JSON.stringify({ error: 'Email identifier required for password reset' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      case 'signup':
        maxAttempts = 3;
        windowMinutes = 30;
        break;
      case 'profile_update':
        maxAttempts = 10;
        windowMinutes = 5;
        break;
      default:
        throw new Error('Invalid action');
    }

    // Use database rate limiting
    const rateLimitKey = action === 'password_reset' && identifier ? 
      `email:${identifier}:${action}` : 
      `ip:${clientIP}:${action}`;
    
    const { data: result, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_identifier: rateLimitKey,
      p_action: action,
      p_max_attempts: maxAttempts,
      p_window_minutes: windowMinutes
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit service unavailable',
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 60000
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: result.allowed ? 200 : 429, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Enhanced rate limit error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        message: 'Rate limiting service temporarily unavailable'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});