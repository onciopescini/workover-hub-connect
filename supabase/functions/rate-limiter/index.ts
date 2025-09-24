import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

// Rate limit configurations
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'auth': { windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: 'auth' }, // 5 per 15min
  'booking': { windowMs: 60 * 1000, maxRequests: 10, keyPrefix: 'booking' }, // 10 per minute
  'contact': { windowMs: 60 * 1000, maxRequests: 3, keyPrefix: 'contact' }, // 3 per minute
  'search': { windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'search' }, // 30 per minute
  'profile': { windowMs: 60 * 1000, maxRequests: 20, keyPrefix: 'profile' }, // 20 per minute
  'default': { windowMs: 60 * 1000, maxRequests: 100, keyPrefix: 'default' } // 100 per minute
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { endpoint, identifier, userAgent, ip } = await req.json()
    
    console.log(`Rate limit check for: ${endpoint}, identifier: ${identifier}`)

    if (!endpoint || !identifier) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint or identifier' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default
    const now = Date.now()
    const windowStart = now - config.windowMs
    
    // Create unique key combining endpoint and identifier
    const rateLimitKey = `${config.keyPrefix}:${identifier}`
    
    // Clean up old entries first
    await supabase
      .from('rate_limits')
      .delete()
      .lt('created_at', new Date(windowStart).toISOString())

    // Count current requests in window
    const { data: currentRequests, error: countError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('key', rateLimitKey)
      .gte('created_at', new Date(windowStart).toISOString())

    if (countError) {
      console.error('Error counting requests:', countError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const requestCount = currentRequests?.length || 0
    
    if (requestCount >= config.maxRequests) {
      const resetTime = windowStart + config.windowMs
      const retryAfter = Math.ceil((resetTime - now) / 1000)
      
      console.log(`Rate limit exceeded for ${rateLimitKey}: ${requestCount}/${config.maxRequests}`)
      
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retryAfter,
          limit: config.maxRequests,
          windowMs: config.windowMs
        }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      )
    }

    // Record this request
    const { error: insertError } = await supabase
      .from('rate_limits')
      .insert({
        key: rateLimitKey,
        endpoint,
        identifier,
        user_agent: userAgent || null,
        ip_address: ip || null,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error recording request:', insertError)
      // Don't fail the request if we can't record it
    }

    const remaining = Math.max(0, config.maxRequests - requestCount - 1)
    const resetTime = now + config.windowMs

    return new Response(
      JSON.stringify({ 
        allowed: true,
        limit: config.maxRequests,
        remaining,
        resetTime,
        windowMs: config.windowMs
      }),
      {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetTime.toString()
        }
      }
    )

  } catch (error) {
    console.error('Rate limiter error:', error)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})