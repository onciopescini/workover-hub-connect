
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.3.9.3';

// Definisco le intestazioni per le richieste CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Definisco le interfacce per la richiesta di limitazione
interface RateLimitRequest {
  action: 'login' | 'password_reset';
  identifier?: string; // email per il reset della password
}

interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
}

// Implemento una semplice memorizzazione in memoria per il rate-limiting
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
    // Reset o primo tentativo
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime
    };
  }

  if (current.count >= maxAttempts) {
    // Limitazione superata
    const waitTime = Math.ceil(((resetTime - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      message: `Troppi tentativi. Riprova tra ${waitTime} secondi.`
    };
  }

  // Incrementa il contatore
  current.count++;
  rateLimitStore.set(key, current);

  return {
    allowed: true,
    remaining: maxAttempts - current.count,
    resetTime
  };
}

// Implemento l'handler per le richieste
Deno.serve(async (req) => {
  // Gestisco la richiesta CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Ottengo l'indirizzo del client
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     req.headers.get('cf-connecting-ip') ||
                     'unknown';

    // Controllo del rate limit per IP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Analizzo il corpo della richiesta
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

    // Configuro i limitazioni in base sull'azione
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

    // Genero la chiave di rate limit
    const rateLimitKey = getRateLimitKey(clientIP, action, identifier);
    
    // Verifico il rate limit
    const result = checkRateLimit(rateLimitKey, maxAttempts, windowSeconds);
    
    // Risultato del rate limit
    const response: RateLimitResponse = {
      allowed: result.allowed,
      remaining: result.remaining,
      resetTime: result.resetTime,
      message: result.message
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: response.allowed ? 200 : 429, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        allowed: false, // Fail closed for security
        remaining: 0,
        resetTime: Date.now() + 60000,
        message: 'Servizio temporaneamente non disponibile. Riprova più tardi.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
