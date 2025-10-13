import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { combineHeaders } from '../_shared/security-headers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateLimitRequest {
  identifier: string; // IP address or user ID
  action: string; // 'login', 'password_reset', 'api_call', 'space_creation', 'message_send'
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  login: { maxAttempts: 5, windowMinutes: 15 },
  password_reset: { maxAttempts: 3, windowMinutes: 60 },
  api_call_authenticated: { maxAttempts: 100, windowMinutes: 1 },
  api_call_anonymous: { maxAttempts: 20, windowMinutes: 1 },
  space_creation: { maxAttempts: 10, windowMinutes: 1440 }, // 24 hours
  message_send: { maxAttempts: 50, windowMinutes: 60 }
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { identifier, action }: RateLimitRequest = await req.json();

    if (!identifier || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing identifier or action' }),
        { status: 400, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
      );
    }

    const config = RATE_LIMIT_CONFIGS[action] || RATE_LIMIT_CONFIGS.api_call_anonymous;
    const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);

    // Get IP and User Agent from request
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Check existing attempts within window
    const { data: existingAttempts, error: selectError } = await supabaseClient
      .from('rate_limit_log')
      .select('*')
      .eq('identifier', identifier)
      .eq('action', action)
      .gte('window_start', windowStart.toISOString())
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking rate limit:', selectError);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
      );
    }

    let currentAttempts = existingAttempts?.attempt_count || 0;
    const isBlocked = existingAttempts?.blocked_until && new Date(existingAttempts.blocked_until) > new Date();

    if (isBlocked) {
      return new Response(
        JSON.stringify({
          allowed: false,
          remaining: 0,
          resetTime: existingAttempts.blocked_until,
          message: 'Rate limit exceeded. Please try again later.'
        }),
        { status: 429, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
      );
    }

    // Increment attempt count
    currentAttempts++;

    if (currentAttempts > config.maxAttempts) {
      // Block user with exponential backoff
      const blockMinutes = Math.min(config.windowMinutes * 2, 120); // Max 2 hours
      const blockedUntil = new Date(Date.now() + blockMinutes * 60 * 1000);

      await supabaseClient
        .from('rate_limit_log')
        .upsert({
          identifier,
          action,
          attempt_count: currentAttempts,
          blocked_until: blockedUntil.toISOString(),
          window_start: new Date().toISOString(),
          ip_address: ip,
          user_agent: userAgent
        }, { onConflict: 'identifier,action' });

      return new Response(
        JSON.stringify({
          allowed: false,
          remaining: 0,
          resetTime: blockedUntil.toISOString(),
          message: `Rate limit exceeded. Blocked until ${blockedUntil.toISOString()}`
        }),
        { status: 429, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
      );
    }

    // Update attempt count
    await supabaseClient
      .from('rate_limit_log')
      .upsert({
        identifier,
        action,
        attempt_count: currentAttempts,
        window_start: existingAttempts?.window_start || new Date().toISOString(),
        ip_address: ip,
        user_agent: userAgent
      }, { onConflict: 'identifier,action' });

    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: config.maxAttempts - currentAttempts,
        resetTime: new Date(Date.now() + config.windowMinutes * 60 * 1000).toISOString(),
        message: 'Request allowed'
      }),
      { status: 200, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
    );

  } catch (error) {
    console.error('Rate limit check error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
    );
  }
});
