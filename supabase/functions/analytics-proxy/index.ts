import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const body = await req.text();
    const contentType = req.headers.get('content-type') || 'application/x-www-form-urlencoded';
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';

    // Forward to Plausible with rate limiting
    let response;
    try {
      response = await fetch('https://plausible.io/api/event', {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'User-Agent': userAgent,
          'Referer': referer,
          'X-Forwarded-For': req.headers.get('x-forwarded-for') || 'unknown'
        },
        body: body
      });
    } catch (fetchError) {
       // Network failure or timeout
       console.error('Analytics upstream connection failed:', fetchError);
       // Return 200 OK to client to prevent frontend errors
       return new Response('Analytics accepted (Upstream Error)', {
         status: 200,
         headers: corsHeaders
       });
    }

    // Log for debugging
    console.log('Analytics proxy request:', {
      status: response.status,
      referer,
      userAgent: userAgent.substring(0, 50) + '...'
    });

    if (!response.ok) {
      // Log the specific upstream error
      console.warn('Plausible API error:', response.status, await response.text());

      // CRITICAL FIX: Return 200 OK to the client even if upstream fails.
      // The frontend script will crash or retry aggressively if it receives a 5xx.
      // We accept the event "successfully" from the client's perspective.
      return new Response('Analytics accepted (Upstream Error)', {
        status: 200,
        headers: corsHeaders
      });
    }

    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    // Global function error (e.g. parsing)
    console.error('Analytics proxy critical error:', error);
    // Even here, we try to be nice to the client, though 500 is technically correct for a crash.
    // However, for an optional analytics pixel, we prefer it fails silently.
    return new Response('Analytics accepted (Internal Error)', {
      status: 200,
      headers: corsHeaders
    });
  }
});
