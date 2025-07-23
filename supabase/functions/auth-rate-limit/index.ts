import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RateLimitRequest {
  action: 'login' | 'password_reset';
  identifier?: string; // email for password reset
}

interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
}

// In-memory rate limit store (for demo - use Redis/KV in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(ip: string, action: string, identifier?: string): string {
  if (action === 'password_reset' && identifier) {
    return `rl:email:${identifier}:${action}`;
  }
  return `rl:ip:${ip}:${action}`;
}

function checkRateLimit(key: string, maxAttempts: number, windowSeconds: number): RateLimitResponse {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const resetTime = Math.floor(now / windowMs) * windowMs + windowMs;
  
  const current = rateLimitStore.get(key);
  
  if (!current || current.resetTime <= now) {
    // Reset or first attempt
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime
    };
  }
  
  if (current.count >= maxAttempts) {
    // Rate limit exceeded
    const waitTime = Math.ceil((resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      message: `Troppi tentativi. Riprova tra ${waitTime} secondi.`
    };
  }
  
  // Increment counter
  current.count++;
  rateLimitStore.set(key, current);
  
  return {
    allowed: true,
    remaining: maxAttempts - current.count,
    resetTime
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     req.headers.get('cf-connecting-ip') ||
                     'unknown';

    // Rate limit check for IP

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { action, identifier }: RateLimitRequest = await req.json();
    
    if (!action || !['login', 'password_reset'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "login" or "password_reset"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Configure rate limits based on action
    let maxAttempts: number;
    let windowSeconds: number;
    
    if (action === 'login') {
      maxAttempts = 5;
      windowSeconds = 60;
    } else if (action === 'password_reset') {
      maxAttempts = 3;
      windowSeconds = 60;
      if (!identifier) {
        return new Response(
          JSON.stringify({ error: 'Email identifier required for password reset rate limiting' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else {
      throw new Error('Invalid action');
    }

    // Generate rate limit key
    const rateLimitKey = getRateLimitKey(clientIP, action, identifier);
    
    // Check rate limit
    const result = checkRateLimit(rateLimitKey, maxAttempts, windowSeconds);
    
    // Rate limit result calculated
      allowed: result.allowed,
      remaining: result.remaining,
      action
    });

    return new Response(
      JSON.stringify(result),
      { 
        status: result.allowed ? 200 : 429, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error in auth-rate-limit function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        allowed: true, // Fail open for availability
        remaining: 5,
        resetTime: Date.now() + 60000
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})